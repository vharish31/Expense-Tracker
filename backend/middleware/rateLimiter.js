// In-memory security rate limiter for authentication & authorization endpoints

const loginAttempts = new Map();
const pinAttempts = new Map();

// Clean up stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of loginAttempts.entries()) {
        if (now - record.firstAttempt > 15 * 60 * 1000) {
            loginAttempts.delete(key);
        }
    }
    for (const [key, record] of pinAttempts.entries()) {
        if (now - record.firstAttempt > 15 * 60 * 1000) {
            pinAttempts.delete(key);
        }
    }
}, 10 * 60 * 1000);

/**
 * Middleware: Rate limit login attempts
 * Max 5 attempts per 15 minutes per IP + email combination
 */
function loginRateLimiter(req, res, next) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : "anonymous";
    const key = `${ip}:${email}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    let record = loginAttempts.get(key);

    if (!record || now - record.firstAttempt > windowMs) {
        record = { count: 0, firstAttempt: now };
        loginAttempts.set(key, record);
    }

    if (record.count >= maxAttempts) {
        const remainingMinutes = Math.ceil((record.firstAttempt + windowMs - now) / 60000);
        return res.status(429).json({
            message: `Too many failed login attempts. Please try again after ${remainingMinutes} minute(s).`
        });
    }

    // Attach tracker to request so authController can increment on failure
    req.recordFailedLogin = () => {
        record.count += 1;
    };

    req.clearFailedLogin = () => {
        loginAttempts.delete(key);
    };

    next();
}

/**
 * Middleware: Rate limit payment PIN verification
 * Max 5 failed attempts per 15 minutes per user ID
 */
function pinRateLimiter(req, res, next) {
    const userId = req.user?.id || req.body?.userId || "unknown_user";
    const key = `pin:${userId}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 5;

    let record = pinAttempts.get(key);

    if (!record || now - record.firstAttempt > windowMs) {
        record = { count: 0, firstAttempt: now };
        pinAttempts.set(key, record);
    }

    if (record.count >= maxAttempts) {
        const remainingMinutes = Math.ceil((record.firstAttempt + windowMs - now) / 60000);
        return res.status(429).json({
            message: `Account temporarily locked for payments due to repeated invalid PIN attempts. Try again in ${remainingMinutes} minute(s).`
        });
    }

    req.recordFailedPin = () => {
        record.count += 1;
    };

    req.clearFailedPin = () => {
        pinAttempts.delete(key);
    };

    next();
}

module.exports = {
    loginRateLimiter,
    pinRateLimiter
};
