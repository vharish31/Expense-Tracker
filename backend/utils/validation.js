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
    "4040", "5050", "6060", "7070", "8080", "9090"
]);

/**
 * 1. Name Validation
 * Rule                Validation
 * Required            Cannot be empty
 * Minimum length      3 characters
 * Maximum length      50 characters
 * Allowed characters  Letters and spaces
 * Numbers             Not allowed
 * Special characters  Not allowed, except spaces
 * Spaces              No leading or trailing spaces
 */
function validateName(name) {
    if (!name || typeof name !== "string" || name.length === 0) {
        return { valid: false, error: "Please enter your name." };
    }

    if (name.startsWith(" ") || name.endsWith(" ")) {
        return { valid: false, error: "Name cannot start or end with a space." };
    }

    if (/[0-9]/.test(name)) {
        return { valid: false, error: "Numbers are not allowed in name." };
    }

    if (/[^a-zA-Z\s]/.test(name)) {
        return { valid: false, error: "Special characters are not allowed in name." };
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
        return { valid: false, error: "Name can only contain letters and spaces." };
    }

    if (name.length < 3) {
        return { valid: false, error: "Name must contain at least 3 characters." };
    }

    if (name.length > 50) {
        return { valid: false, error: "Name must not exceed 50 characters." };
    }

    return { valid: true, value: name.replace(/\s+/g, " ") };
}

/**
 * Email Validation
 * - Required
 * - Max length: 64 characters
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
    if (trimmed.length === 0 || trimmed.length > 64) {
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
 * 3. Mobile Number Validation (India)
 * Rule         Validation
 * Required     Yes
 * Length       Exactly 10 digits
 * First digit  6, 7, 8, or 9
 * Letters      Not allowed
 */
function validateMobile(phone) {
    if (phone === undefined || phone === null || String(phone).trim() === "") {
        return { valid: false, error: "Please enter your mobile number." };
    }

    const rawStr = String(phone);
    if (/[a-zA-Z]/.test(rawStr)) {
        return { valid: false, error: "Letters are not allowed in mobile number." };
    }

    let clean = rawStr.trim().replace(/[\s\-()]/g, "");
    if (clean.startsWith("+91")) clean = clean.slice(3);
    else if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);
    else if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);

    if (/\D/.test(clean)) {
        return { valid: false, error: "Letters and special characters are not allowed in mobile number." };
    }

    if (clean.length !== 10) {
        return { valid: false, error: "Mobile number must be exactly 10 digits." };
    }

    if (!/^[6-9]/.test(clean)) {
        return { valid: false, error: "Mobile number must start with 6, 7, 8, or 9." };
    }

    return { valid: true, value: clean };
}

/**
 * Reasonably Strong Password Policy Validation
 * Rule             Validation
 * Required         Yes
 * Minimum length   8 characters
 * Maximum length   64 characters
 * Uppercase        At least 1
 * Lowercase        At least 1
 * Number           At least 1
 * Special char     At least 1
 * Spaces           Not allowed
 */
function validatePassword(password) {
    if (!password || typeof password !== "string" || password.length === 0) {
        return { valid: false, error: "Please enter your password." };
    }

    if (/\s/.test(password)) {
        return { valid: false, error: "Password must not contain spaces." };
    }

    if (password.length < 8) {
        return { valid: false, error: "Password must contain at least 8 characters." };
    }

    if (password.length > 64) {
        return { valid: false, error: "Password must not exceed 64 characters." };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: "Password must include at least 1 uppercase letter." };
    }

    if (!/[a-z]/.test(password)) {
        return { valid: false, error: "Password must include at least 1 lowercase letter." };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, error: "Password must include at least 1 number." };
    }

    if (!/[!@#$%^&*(),.?":{}|<>\-_+=\[\]~`\/\\;']/.test(password)) {
        return { valid: false, error: "Password must include at least 1 special character." };
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
