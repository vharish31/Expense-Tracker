const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
    validateName,
    validateEmail,
    validateMobile,
    validatePassword,
    validatePaymentPin
} = require("../utils/validation");
const { validateEmailFull } = require("../services/emailValidationService");
const {
    generateAndSendOTP,
    verifyOTP,
    isEmailVerified,
    markVerificationConsumed
} = require("../services/emailVerificationService");

function createToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });
}

/**
 * Send 6-digit OTP to email for verification
 */
exports.sendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await generateAndSendOTP(email);
        return res.status(result.status || 200).json(result);
    } catch (error) {
        console.error("sendVerificationCode error:", error);
        return res.status(500).json({ success: false, error: "Failed to send verification code." });
    }
};

/**
 * Verify submitted 6-digit OTP
 */
exports.verifyEmailCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        const result = await verifyOTP(email, code);
        return res.status(result.status || 200).json(result);
    } catch (error) {
        console.error("verifyEmailCode error:", error);
        return res.status(500).json({ success: false, error: "Failed to verify code." });
    }
};

/**
 * Validate Email endpoint for real-time / on-blur validation
 * Checks syntax, disposable domains, server-side DNS/MX records, and DB duplicates
 */
exports.validateEmailAddress = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ valid: false, message: "Please enter a valid email address." });
        }

        const result = await validateEmailFull(email, { checkDb: true });
        if (!result.valid) {
            const status = result.isDuplicate ? 409 : 400;
            return res.status(status).json({ valid: false, message: result.error });
        }

        return res.status(200).json({
            valid: true,
            email: result.email,
            domain: result.domain,
            message: "Email address is valid and available."
        });
    } catch (error) {
        console.error("Email validation error:", error);
        return res.status(500).json({ valid: false, message: "Unable to validate email at this time." });
    }
};

/**
 * Register User
 * Validates Name, Email, Mobile, Password, and 4-digit Payment PIN
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone, pin } = req.body;

        // 1. Full Name Validation
        const nameVal = validateName(name);
        if (!nameVal.valid) {
            return res.status(400).json({ message: nameVal.error });
        }

        // 2. Email Validation
        const emailVal = validateEmail(email);
        if (!emailVal.valid) {
            return res.status(400).json({ message: emailVal.error });
        }

        // 3. Indian Mobile Number Validation
        const mobileVal = validateMobile(phone);
        if (!mobileVal.valid) {
            return res.status(400).json({ message: mobileVal.error });
        }

        // 4. Password Policy Validation
        const passwordVal = validatePassword(password);
        if (!passwordVal.valid) {
            return res.status(400).json({ message: passwordVal.error });
        }

        // 5. Four-Digit Payment Security PIN Validation (Required for transfers)
        let hashedPin = null;
        if (pin !== undefined && pin !== null && String(pin).trim() !== "") {
            const pinVal = validatePaymentPin(pin);
            if (!pinVal.valid) {
                return res.status(400).json({ message: pinVal.error });
            }
            hashedPin = await bcrypt.hash(pinVal.value, 10);
        }

        // 6. Check Duplicate Email in PostgreSQL
        const existingEmail = await User.findByEmail(emailVal.value);
        if (existingEmail) {
            return res.status(409).json({
                message: "This email address is already registered."
            });
        }

        // 7. Verify that email has been verified via OTP
        const isVerified = await isEmailVerified(emailVal.value);
        if (!isVerified) {
            return res.status(403).json({
                message: "Please verify your email address with the verification code before registering."
            });
        }

        // 8. Check Duplicate Mobile in PostgreSQL
        const existingPhone = await User.findByPhone(mobileVal.value);
        if (existingPhone) {
            return res.status(409).json({
                message: "This mobile number is already registered."
            });
        }

        // 8. Hash Password securely using bcrypt
        const hashedPassword = await bcrypt.hash(passwordVal.value, 10);

        // 9. Persist user with parameterized SQL queries
        const user = await User.createUser({
            name: nameVal.value,
            email: emailVal.value,
            phone: mobileVal.value,
            password: hashedPassword,
            payment_pin: hashedPin,
            is_email_verified: true
        });

        // 10. Consume email verification token
        await markVerificationConsumed(emailVal.value);

        // 10. Generate token and return secure profile (never return password or PIN)
        res.status(201).json({
            message: "Registered successfully",
            token: createToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                has_pin: Boolean(hashedPin)
            }
        });
    } catch (error) {
        console.error("Register error:", error.message);
        res.status(500).json({ message: "An error occurred while creating your account. Please try again." });
    }
};

/**
 * Login User
 * Strictly validates format and uses generic error message to avoid account enumeration
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Email format validation
        if (!email || typeof email !== "string" || email.trim() === "") {
            return res.status(400).json({ message: "Please enter your email address." });
        }

        const emailVal = validateEmail(email);
        if (!emailVal.valid) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        // 2. Password presence validation
        if (!password || typeof password !== "string" || password === "") {
            return res.status(400).json({ message: "Please enter your password." });
        }

        // 3. User lookup
        const user = await User.findByEmail(emailVal.value);
        if (!user) {
            if (req.recordFailedLogin) req.recordFailedLogin();
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // 4. Password verification
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            if (req.recordFailedLogin) req.recordFailedLogin();
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Clear failed attempts upon successful login
        if (req.clearFailedLogin) req.clearFailedLogin();

        res.status(200).json({
            message: "Login successful",
            token: createToken(user.id),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                has_pin: Boolean(user.payment_pin)
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "An error occurred during sign in. Please try again." });
    }
};

/**
 * Set or Change 4-Digit Payment Security PIN
 */
exports.setPaymentPin = async (req, res) => {
    try {
        const { pin } = req.body;

        const pinVal = validatePaymentPin(pin);
        if (!pinVal.valid) {
            return res.status(400).json({ message: pinVal.error });
        }

        const hashedPin = await bcrypt.hash(pinVal.value, 10);
        await User.updatePaymentPin(req.user.id, hashedPin);

        res.status(200).json({
            message: "4-Digit Security PIN set successfully",
            has_pin: true
        });
    } catch (error) {
        console.error("Set PIN error:", error);
        res.status(500).json({ message: "Failed to set security PIN" });
    }
};

/**
 * Get Profile
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error("Profile error:", error.message);
        res.status(500).json({ message: "Error fetching profile" });
    }
};
