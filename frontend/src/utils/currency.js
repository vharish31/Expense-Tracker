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
