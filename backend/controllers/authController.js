const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function createToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });
}

exports.register = async (req, res) => {
    try {
        const { name, email, password, phone, pin } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                message: "Name, email, mobile number and password are required"
            });
        }

        const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
        if (cleanPhone.length !== 10) {
            return res.status(400).json({
                message: "Please enter a valid 10-digit mobile number"
            });
        }

        if (String(password).length < 4) {
            return res.status(400).json({
                message: "Password must be at least 4 characters"
            });
        }

        let hashedPin = null;
        if (pin) {
            const cleanPin = String(pin).replace(/\D/g, "");
            if (cleanPin.length !== 4) {
                return res.status(400).json({
                    message: "Security PIN must be exactly 4 digits"
                });
            }
            hashedPin = await bcrypt.hash(cleanPin, 10);
        }

        const existingEmail = await User.findByEmail(email.trim().toLowerCase());
        if (existingEmail) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const existingPhone = await User.findByPhone(cleanPhone);
        if (existingPhone) {
            return res.status(409).json({
                message: "An account with this mobile number already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.createUser({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: cleanPhone,
            password: hashedPassword,
            payment_pin: hashedPin
        });

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
        res.status(500).json({ message: "Error registering user" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findByEmail(email.trim().toLowerCase());

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
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
        res.status(500).json({ message: "Error logging in" });
    }
};

exports.setPaymentPin = async (req, res) => {
    try {
        const { pin } = req.body;
        const cleanPin = String(pin || "").replace(/\D/g, "");

        if (cleanPin.length !== 4) {
            return res.status(400).json({ message: "Security PIN must be exactly 4 digits" });
        }

        const hashedPin = await bcrypt.hash(cleanPin, 10);
        await User.updatePaymentPin(req.user.id, hashedPin);

        res.status(200).json({
            message: "4-Digit Security PIN set successfully",
            has_pin: true
        });
    } catch (error) {
        console.error("Set PIN error:", error);
        res.status(500).json({ message: "Error setting security PIN" });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        console.error("Profile error:", error.message);
        res.status(500).json({ message: "Error fetching profile" });
    }
};
