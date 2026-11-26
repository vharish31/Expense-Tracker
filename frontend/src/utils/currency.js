export function formatINR(val, options = {}) {
    const num = Number(val) || 0;
    const { showSign = false, decimals = 2 } = options;
    const formatted = Math.abs(num).toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    const prefix = num < 0 ? "-₹" : showSign && num > 0 ? "+₹" : "₹";
    return `${prefix}${formatted}`;
}

export function formatCompactINR(val) {
    const num = Number(val) || 0;
    if (Math.abs(num) >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
        return `₹${(num / 100000).toFixed(2)} L`;
    }
    if (Math.abs(num) >= 1000) {
        return `₹${(num / 1000).toFixed(1)}k`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * Prevents typing negative sign (-) or exponential notation (e, E, +) in number inputs
 */
export function preventNegativeInput(e) {
    if (e.key === "-" || e.key === "Minus" || e.key === "e" || e.key === "E" || e.key === "+") {
        e.preventDefault();
    }
}

/**
 * Sanitizes monetary amounts so they can never be negative
 */
export function sanitizePositiveAmount(val) {
    if (val === "" || val === undefined || val === null) return "";
    const clean = String(val).replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) {
        return parts[0] + "." + parts.slice(1).join("");
    }
    return clean;
}
