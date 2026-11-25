// Server-side validation rules and utility functions

const COMMON_PASSWORDS = new Set([
    "password", "password123", "12345678", "123456789", "qwerty123",
    "admin123", "welcome123", "letmein123", "iloveyou", "pass@123",
    "password@1", "secret123", "changeme", "abc12345", "test1234"
]);

const PREDICTABLE_PINS = new Set([
    "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
    "0123", "1234", "2345", "3456", "4567", "5678", "6789",
    "9876", "8765", "7654", "6543", "5432", "4321", "3210",
    "1212", "2121", "2580", "0852", "1379", "9731", "1122", "2211",
    "1004", "2000", "2024", "2025", "2026", "1010", "2020", "3030",
    "4040", "5050", "6060", "7070", "8080", "9090", "1470", "0741"
]);

/**
 * Full Name Validation
 * - Required
 * - Min 3, Max 50 characters
 * - Unicode letter support
 * - Allows spaces
 * - Rejects numbers, hyphens, apostrophes, and special characters
 */
function validateName(name) {
    if (!name || typeof name !== "string") {
        return { valid: false, error: "Please enter a valid full name" };
    }

    // Trim and normalize multiple consecutive spaces to a single space
    const normalized = name.trim().replace(/\s+/g, " ");

    if (normalized.length < 3 || normalized.length > 50) {
        return { valid: false, error: "Please enter a valid full name" };
    }

    // Strictly letters and spaces (Unicode letters and combining marks; rejects numbers, hyphens, apostrophes, and punctuation)
    const nameRegex = /^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u;
    if (!nameRegex.test(normalized)) {
        return { valid: false, error: "Please enter a valid full name" };
    }

    return { valid: true, value: normalized };
}

/**
 * Email Validation
 * - Required
 * - Max length: 254 characters
 * - Local part max: 64 characters
 * - Exactly one @ symbol
 * - No whitespace
 * - No consecutive dots
 * - Local part cannot start or end with a dot
 * - Domain cannot start or end with a dot, labels max 63 characters, no edge hyphens
 * - TLD minimum 2 alphabetic characters
 * - Normalized to lowercase
 */
function validateEmail(email) {
    if (!email || typeof email !== "string") {
        return { valid: false, error: "Please enter a valid email address." };
    }

    if (/\s/.test(email)) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const trimmed = email.trim();
    if (trimmed.length === 0 || trimmed.length > 254) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const atParts = trimmed.split("@");
    if (atParts.length !== 2) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const [localPart, rawDomain] = atParts;
    const domain = rawDomain.toLowerCase();

    if (!localPart || localPart.length > 64) {
        return { valid: false, error: "Please enter a valid email address." };
    }
    if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const localRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
    if (!localRegex.test(localPart)) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    if (!domain || domain.length > 253 || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const labels = domain.split(".");
    if (labels.length < 2) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (!label || label.length > 63 || label.startsWith("-") || label.endsWith("-")) {
            return { valid: false, error: "Please enter a valid email address." };
        }
        if (!/^[a-z0-9-]+$/i.test(label)) {
            return { valid: false, error: "Please enter a valid email address." };
        }
    }

    const tld = labels[labels.length - 1];
    if (tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    const normalized = `${localPart.toLowerCase()}@${domain}`;
    return { valid: true, value: normalized, localPart: localPart.toLowerCase(), domain };
}

/**
 * Indian Mobile Number Validation
 * - Required
 * - Exactly 10 digits
 * - Starts with 6, 7, 8, or 9
 * - Normalizes hyphens, spaces, and leading country code
 */
function validateMobile(phone) {
    if (!phone || (typeof phone !== "string" && typeof phone !== "number")) {
        return { valid: false, error: "Enter a valid 10-digit Indian mobile number." };
    }

    // Remove any spaces, hyphens, parentheses, or +91 prefix
    let clean = String(phone).replace(/[\s\-()]/g, "");
    if (clean.startsWith("+91")) clean = clean.slice(3);
    else if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);
    else if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);

    if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
        return { valid: false, error: "Enter a valid 10-digit Indian mobile number." };
    }

    return { valid: true, value: clean };
}

/**
 * Password Policy Validation
 * - Required
 * - Min 8, Max 64 characters
 * - Uppercase, lowercase, number, special character
 * - No spaces
 * - Rejects common weak passwords
 */
function validatePassword(password) {
    if (!password || typeof password !== "string") {
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

    return { valid: true, value: password };
}

/**
 * 4-Digit Security PIN Validation
 * - Exactly 4 numeric digits
 * - Rejects repeated digits (1111, 0000, etc.)
 * - Rejects sequential digits (1234, 4321, 9876, etc.)
 * - Rejects common predictable PINs (2580, 1212, etc.)
 */
function validatePaymentPin(pin) {
    if (!pin || (typeof pin !== "string" && typeof pin !== "number")) {
        return { valid: false, error: "PIN must contain exactly 4 digits." };
    }

    const clean = String(pin).trim();

    if (!/^\d{4}$/.test(clean)) {
        return { valid: false, error: "PIN must contain exactly 4 digits." };
    }

    // Check all same digits
    if (/^(\d)\1{3}$/.test(clean)) {
        return { valid: false, error: "Choose a less predictable PIN." };
    }

    // Check sequential ascending or descending
    const d1 = Number(clean[0]);
    const d2 = Number(clean[1]);
    const d3 = Number(clean[2]);
    const d4 = Number(clean[3]);

    const isAscending = d2 === (d1 + 1) % 10 && d3 === (d2 + 1) % 10 && d4 === (d3 + 1) % 10;
    const isDescending = d2 === (d1 - 1 + 10) % 10 && d3 === (d2 - 1 + 10) % 10 && d4 === (d3 - 1 + 10) % 10;

    if (isAscending || isDescending) {
        return { valid: false, error: "Choose a less predictable PIN." };
    }

    // Check predictable PIN set
    if (PREDICTABLE_PINS.has(clean)) {
        return { valid: false, error: "Choose a less predictable PIN." };
    }

    return { valid: true, value: clean };
}

module.exports = {
    validateName,
    validateEmail,
    validateMobile,
    validatePassword,
    validatePaymentPin
};
