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
export function validateName(name) {
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

    return { valid: true, error: "", value: name.replace(/\s+/g, " ") };
}

/**
 * 2. Email Validation
 * - Required
 * - Max 254 characters
 * - Local part max 64 characters
 * - Domain max 253 characters, labels max 63 characters, no edge hyphens
 * - TLD minimum 2 letters
 * - No whitespace, no consecutive dots
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

    const trimmed = email.trim();
    if (trimmed.length > 254) {
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
    return { valid: true, error: "", value: normalized, domain };
}

/**
 * 3. Mobile Number Validation (India)
 * Rule         Validation
 * Required     Yes
 * Length       Exactly 10 digits
 * First digit  6, 7, 8, or 9
 * Letters      Not allowed
 */
export function validateMobile(phone) {
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

    return { valid: true, error: "", value: clean };
}

/**
 * 4. Reasonably Strong Password Policy Validation
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
export function validatePassword(password) {
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
 * Dynamic Password Strength Assessment according to policy rules:
 * 1. Length (8-64 characters)
 * 2. At least 1 uppercase letter
 * 3. At least 1 lowercase letter
 * 4. At least 1 number
 * 5. At least 1 special character
 * 6. No spaces allowed
 * 
 * Levels: Weak (0-40%), Medium (60-80%), Strong (100% - all rules satisfied)
 */
export function getPasswordStrength(password) {
    if (!password || typeof password !== "string" || password.length === 0) {
        return {
            score: 0,
            percent: 0,
            level: "",
            label: "",
            color: "#E2E8F0",
            rulesMet: 0,
            rules: {
                length: false,
                upper: false,
                lower: false,
                number: false,
                special: false,
                noSpaces: true
            }
        };
    }

    const hasSpaces = /\s/.test(password);
    const hasLength = password.length >= 8 && password.length <= 64;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]~`\/\\;']/.test(password);

    const rules = {
        length: hasLength,
        upper: hasUpper,
        lower: hasLower,
        number: hasNumber,
        special: hasSpecial,
        noSpaces: !hasSpaces
    };

    const rulesMet = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    // Percent progress (0 to 100%)
    let percent = Math.round((rulesMet / 5) * 100);
    if (hasSpaces) {
        percent = Math.min(percent, 25);
    }

    let level = "Weak";
    let color = "#EF4444";

    if (hasSpaces) {
        level = "Weak";
        color = "#EF4444";
    } else if (rulesMet === 5) {
        level = "Strong";
        color = "#10B981";
    } else if (rulesMet >= 3) {
        level = "Medium";
        color = "#F59E0B";
    } else {
        level = "Weak";
        color = "#EF4444";
    }

    return {
        score: percent, // For CSS width: `${passwordStrength.score}%`
        percent: percent,
        level: level,   // For level === "Strong"
        label: level,   // For label compatibility
        color: color,
        rulesMet: rulesMet,
        rules: rules
    };
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
