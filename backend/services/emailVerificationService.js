const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { validateEmailFull } = require("./emailValidationService");
const { sendOTPEmail } = require("./emailService");

const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate and dispatch a 6-digit verification code to the requested email
 */
async function generateAndSendOTP(email) {
    // 1. Full email validation (Syntax + Disposable + DNS + DB Duplicate check)
    const validation = await validateEmailFull(email, { checkDb: true });
    if (!validation.valid) {
        return {
            success: false,
            status: validation.isDuplicate ? 409 : 400,
            error: validation.error
        };
    }

    const cleanEmail = validation.email;

    // 2. Check Resend Cooldown (must wait at least 60s since last sent OTP)
    const recentOtpResult = await pool.query(
        `SELECT id, last_sent_at,
         EXTRACT(EPOCH FROM (NOW() - last_sent_at))::INT AS seconds_since_last
         FROM email_verifications
         WHERE email = $1 AND verified = FALSE
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail]
    );

    if (recentOtpResult.rows.length > 0) {
        const secondsSinceLast = recentOtpResult.rows[0].seconds_since_last;
        if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
            const remaining = RESEND_COOLDOWN_SECONDS - secondsSinceLast;
            return {
                success: false,
                status: 429,
                cooldown: true,
                remainingSeconds: remaining,
                error: `Please wait ${remaining} seconds before requesting a new code.`
            };
        }
    }

    // 3. Generate Cryptographically Secure 6-digit numeric OTP
    const rawOtp = String(crypto.randomInt(100000, 1000000));

    // 4. Hash the OTP with bcrypt before saving to DB
    const otpHashed = await bcrypt.hash(rawOtp, 10);

    // 5. Invalidate any existing unverified OTP records for this email
    await pool.query(
        "DELETE FROM email_verifications WHERE email = $1 AND verified = FALSE",
        [cleanEmail]
    );

    // 6. Insert new OTP record with 5-minute expiry
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await pool.query(
        `INSERT INTO email_verifications (email, otp_hash, attempts, expires_at, last_sent_at, verified)
         VALUES ($1, $2, 0, $3, NOW(), FALSE)`,
        [cleanEmail, otpHashed, expiresAt]
    );

    // 7. Dispatch the email via Nodemailer
    await sendOTPEmail(cleanEmail, rawOtp);

    return {
        success: true,
        status: 200,
        email: cleanEmail,
        message: "Verification code sent successfully.",
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        expiryMinutes: OTP_EXPIRY_MINUTES
    };
}

/**
 * Verify the user-submitted 6-digit OTP
 */
async function verifyOTP(email, code) {
    if (!email || typeof email !== "string") {
        return { success: false, status: 400, error: "Please enter your email address." };
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!code || typeof code !== "string" && typeof code !== "number") {
        return { success: false, status: 400, error: "Please enter the 6-digit verification code." };
    }

    const cleanCode = String(code).trim();
    if (!/^\d{6}$/.test(cleanCode)) {
        return { success: false, status: 400, error: "Verification code must be exactly 6 numeric digits." };
    }

    // Query active unverified OTP for this email
    const result = await pool.query(
        `SELECT id, otp_hash, attempts, expires_at
         FROM email_verifications
         WHERE email = $1 AND verified = FALSE
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail]
    );

    if (result.rows.length === 0) {
        return {
            success: false,
            status: 400,
            error: "No active verification code found. Please request a new code."
        };
    }

    const record = result.rows[0];

    // Check expiration
    if (new Date(record.expires_at) < new Date()) {
        return {
            success: false,
            status: 400,
            expired: true,
            error: "Verification code has expired. Please request a new code."
        };
    }

    // Check maximum attempts limit (max 5)
    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        return {
            success: false,
            status: 429,
            maxAttempts: true,
            error: "Maximum verification attempts exceeded. Please request a new code."
        };
    }

    // Verify hash
    const isMatch = await bcrypt.compare(cleanCode, record.otp_hash);

    if (!isMatch) {
        const nextAttempts = record.attempts + 1;
        await pool.query(
            "UPDATE email_verifications SET attempts = $1 WHERE id = $2",
            [nextAttempts, record.id]
        );

        const remainingAttempts = Math.max(0, MAX_VERIFICATION_ATTEMPTS - nextAttempts);
        return {
            success: false,
            status: 400,
            attemptsRemaining: remainingAttempts,
            error: remainingAttempts > 0
                ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
                : "Maximum verification attempts exceeded. Please request a new code."
        };
    }

    // Match successful! Mark as verified
    await pool.query(
        "UPDATE email_verifications SET verified = TRUE, verified_at = NOW() WHERE id = $1",
        [record.id]
    );

    return {
        success: true,
        status: 200,
        email: cleanEmail,
        message: "Email address verified successfully."
    };
}

/**
 * Check if the email has been verified recently (within the last 30 minutes)
 */
async function isEmailVerified(email) {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();

    const result = await pool.query(
        `SELECT id FROM email_verifications
         WHERE email = $1 AND verified = TRUE
           AND (verified_at >= NOW() - INTERVAL '30 minutes' OR created_at >= NOW() - INTERVAL '30 minutes')
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail]
    );

    return result.rows.length > 0;
}

/**
 * Cleanup / consume verification records after successful registration
 */
async function markVerificationConsumed(email) {
    const cleanEmail = email.toLowerCase().trim();
    await pool.query(
        "DELETE FROM email_verifications WHERE email = $1",
        [cleanEmail]
    );
}

module.exports = {
    generateAndSendOTP,
    verifyOTP,
    isEmailVerified,
    markVerificationConsumed
};
