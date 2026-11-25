/**
 * Reusable Frontend Validation Utilities for Expense Tracker
 * Enforces production-grade validation matching the backend specification.
 */

export const COMMON_PASSWORDS = new Set([
    "password", "password123", "12345678", "123456789", "qwerty123",
    "admin123", "welcome123", "letmein123", "iloveyou", "pass@123",
    "password@1", "secret123", "changeme", "abc12345", "test1234"
]);

export const PREDICTABLE_PINS = new Set([
    "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
    "0123", "1234", "2345", "3456", "4567", "5678", "6789",
    "9876", "8765", "7654", "6543", "5432", "4321", "3210",
    "1212", "2121", "2580", "0852", "1379", "9731", "1122", "2211",
    "1004", "2000", "2024", "2025", "2026", "1010", "2020", "3030",
    "4040", "5050", "6060", "7070", "8080", "9090", "1470", "0741"
]);

/**
 * 1. Full Name Validation
 * - Required
 * - Min 3, Max 50 characters
 * - Unicode letter support
 * - Allows single spaces between words
 * - Rejects numbers, hyphens, apostrophes, and punctuation
 * Error: "Please enter a valid full name"
 */
export function validateName(name) {
    if (!name || typeof name !== "string") {
        return { valid: false, error: "Please enter a valid full name" };
    }

    const trimmed = name.trim();
    const normalized = trimmed.replace(/\s+/g, " ");

    if (normalized.length < 3 || normalized.length > 50) {
        return { valid: false, error: "Please enter a valid full name" };
    }

    const nameRegex = /^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u;
    if (!nameRegex.test(normalized)) {
        return { valid: false, error: "Please enter a valid full name" };
    }

    return { valid: true, error: "", value: normalized };
}

/**
 * 2. Email Validation
 * - Required
 * - Valid format
 * - Max 50 characters
 * - No spaces
 * - Lowercase normalized
 * Error: "Please enter a valid email address."
 */
export function validateEmail(email) {
    if (!email || typeof email !== "string" || email.trim() === "") {
        return { valid: false, error: "Please enter your email address." };
    }

    if (/\s/.test(email)) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const normalized = email.trim().toLowerCase();

    if (normalized.length > 50) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(normalized)) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    return { valid: true, error: "", value: normalized };
}

/**
 * 3. Mobile Number Validation (Indian)
 * - Required
 * - Exactly 10 digits
 * - Starts with 6, 7, 8, or 9
 * - Normalizes spaces, hyphens, +91 prefix
 * Error: "Enter a valid 10-digit Indian mobile number."
 */
export function validateMobile(phone) {
    if (!phone || (typeof phone !== "string" && typeof phone !== "number")) {
        return { valid: false, error: "Enter a valid 10-digit Indian mobile number." };
    }

    let clean = String(phone).replace(/[\s\-()]/g, "");
    if (clean.startsWith("+91")) clean = clean.slice(3);
    else if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);
    else if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);

    if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
        return { valid: false, error: "Enter a valid 10-digit Indian mobile number." };
    }

    return { valid: true, error: "", value: clean };
}

/**
 * 4. Password Policy Validation
 * - Min 8, Max 64 chars
 * - At least 1 uppercase, 1 lowercase, 1 number, 1 special character
 * - No spaces allowed
 * - Reject common or weak passwords
 * Errors:
 * "Password must contain at least 8 characters."
 * "Please choose a stronger password."
 */
export function validatePassword(password) {
    if (!password || typeof password !== "string" || password === "") {
        return { valid: false, error: "Please enter your password." };
    }

    if (password.length < 8) {
        return { valid: false, error: "Password must contain at least 8 characters." };
    }

    if (password.length > 64) {
        return { valid: false, error: "Password must not exceed 64 characters." };
    }

    if (/\s/.test(password)) {
        return { valid: false, error: "Password must not contain spaces." };
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]~`/\\]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return { valid: false, error: "Please choose a stronger password." };
    }

    const lower = password.toLowerCase();
    const baseWord = lower.replace(/[0-9!@#$%^&*(),.?":{}|<>\-_+=\[\]~`/\\]+$/g, "");

    if (COMMON_PASSWORDS.has(lower) || (baseWord.length >= 4 && COMMON_PASSWORDS.has(baseWord))) {
        return { valid: false, error: "Please choose a stronger password." };
    }

    return { valid: true, error: "", value: password };
}

/**
 * Confirm Password Validation
 * Error: "Passwords do not match."
 */
export function validateConfirmPassword(password, confirmPassword) {
    if (!confirmPassword || confirmPassword === "") {
        return { valid: false, error: "Please confirm your password." };
    }

    if (password !== confirmPassword) {
        return { valid: false, error: "Passwords do not match." };
    }

    return { valid: true, error: "" };
}

/**
 * Password Strength Assessment
 * Levels: Weak, Medium, Strong
 */
export function getPasswordStrength(password) {
    if (!password) {
        return { score: 0, label: "", color: "#e2e8f0", percent: 0 };
    }

    let score = 0;
    const checks = {
        length: password.length >= 8,
        lengthGood: password.length >= 10,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>\-_+=\[\]~`/\\]/.test(password),
        noSpaces: !/\s/.test(password),
        notCommon: !COMMON_PASSWORDS.has(password.toLowerCase())
    };

    if (checks.length) score += 1;
    if (checks.lengthGood) score += 1;
    if (checks.upper && checks.lower) score += 1;
    if (checks.number) score += 1;
    if (checks.special) score += 1;
    if (checks.noSpaces && checks.notCommon) score += 1;

    if (score <= 2) {
        return { score: 1, label: "Weak", color: "#EF4444", percent: 33, checks };
    } else if (score <= 4) {
        return { score: 2, label: "Medium", color: "#F59E0B", percent: 66, checks };
    } else {
        return { score: 3, label: "Strong", color: "#10B981", percent: 100, checks };
    }
}

/**
 * 5. Four-Digit Payment Security PIN Validation
 * - Exactly 4 numeric digits
 * - Rejects repeated digits (0000, 1111, ...)
 * - Rejects sequential digits (1234, 4321, 9876, ...)
 * - Rejects common predictable PINs (2580, 1212, ...)
 * Errors:
 * "PIN must contain exactly 4 digits."
 * "Choose a less predictable PIN."
 */
export function validatePaymentPin(pin) {
    if (!pin || (typeof pin !== "string" && typeof pin !== "number")) {
        return { valid: false, error: "PIN must contain exactly 4 digits." };
    }

    const clean = String(pin).trim();

    if (!/^\d{4}$/.test(clean)) {
        return { valid: false, error: "PIN must contain exactly 4 digits." };
    }

    // Repeated digits check
    if (/^(\d)\1{3}$/.test(clean)) {
        return { valid: false, error: "Choose a less predictable PIN." };
    }

    // Sequential check
    const d1 = Number(clean[0]);
    const d2 = Number(clean[1]);
    const d3 = Number(clean[2]);
    const d4 = Number(clean[3]);

    const isAscending = d2 === (d1 + 1) % 10 && d3 === (d2 + 1) % 10 && d4 === (d3 + 1) % 10;
    const isDescending = d2 === (d1 - 1 + 10) % 10 && d3 === (d2 - 1 + 10) % 10 && d4 === (d3 - 1 + 10) % 10;

    if (isAscending || isDescending) {
        return { valid: false, error: "Choose a less predictable PIN." };
    }

    // Predictable list check
    if (PREDICTABLE_PINS.has(clean)) {
        return { valid: false, error: "Choose a less predictable PIN." };
    }

    return { valid: true, error: "", value: clean };
}

/**
 * Confirm Payment PIN Validation
 * Error: "Payment PINs do not match."
 */
export function validateConfirmPin(pin, confirmPin) {
    if (!confirmPin || String(confirmPin).trim() === "") {
        return { valid: false, error: "Please confirm your 4-digit PIN." };
    }

    if (String(pin).trim() !== String(confirmPin).trim()) {
        return { valid: false, error: "Payment PINs do not match." };
    }

    return { valid: true, error: "" };
}
