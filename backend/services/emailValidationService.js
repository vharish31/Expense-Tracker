const { Resolver } = require("dns").promises;
const dns = require("dns").promises;
const pool = require("../config/db");

// Configure high-speed public DNS resolver (Google & Cloudflare)
const fastResolver = new Resolver();
try {
    fastResolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);
} catch (e) {
    // Graceful fallback
}

// Known legitimate email providers (fast path & offline/transient failure fallback)
const KNOWN_MAJOR_DOMAINS = new Set([
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "yahoo.com",
    "yahoo.co.in",
    "yahoo.co.uk",
    "icloud.com",
    "me.com",
    "proton.me",
    "protonmail.com",
    "zoho.com",
    "zoho.in",
    "aol.com",
    "rediffmail.com",
    "yandex.com",
    "mail.com",
    "gmx.com"
]);

// Common disposable/temporary email provider domains
const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com",
    "tempmail.com",
    "temp-mail.org",
    "10minutemail.com",
    "guerrillamail.com",
    "sharklasers.com",
    "trashmail.com",
    "yopmail.com",
    "getnada.com",
    "dispostable.com",
    "fakeinbox.com",
    "throwawaymail.com",
    "mytemp.email",
    "mohmal.com",
    "inboxkitten.com",
    "nada.ltd",
    "crazymailing.com",
    "dropmail.me",
    "generator.email",
    "burnermail.io",
    "maildrop.cc",
    "tmpmail.org",
    "tmpmail.net",
    "disposablemail.com"
]);

/**
 * Validate Email Syntax according to strict standards:
 * - Email is required
 * - Total length <= 254 chars
 * - Local part <= 64 chars
 * - Exactly one @ symbol
 * - No whitespace
 * - No consecutive dots
 * - Local part cannot start or end with a dot
 * - Domain <= 253 chars
 * - Each domain label <= 63 chars, cannot begin or end with hyphen
 * - Domain labels must be valid hostname chars (a-z, 0-9, hyphen)
 * - TLD must be at least 2 chars, letters only
 */
function validateEmailSyntax(email) {
    if (!email || typeof email !== "string") {
        return { valid: false, error: "Please enter your email address." };
    }

    // Reject whitespace anywhere
    if (/\s/.test(email)) {
        return { valid: false, error: "Email address cannot contain spaces." };
    }

    const trimmed = email.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: "Please enter your email address." };
    }

    if (trimmed.length > 254) {
        return { valid: false, error: "Email address exceeds maximum length of 254 characters." };
    }

    // Exactly one @ symbol
    const atParts = trimmed.split("@");
    if (atParts.length !== 2) {
        return { valid: false, error: "Please enter a valid email address with exactly one @ symbol." };
    }

    const [localPart, rawDomain] = atParts;
    const domain = rawDomain.toLowerCase();
    const normalizedLocal = localPart;

    // Local part validation
    if (!normalizedLocal || normalizedLocal.length === 0) {
        return { valid: false, error: "Email username/local part cannot be empty." };
    }
    if (normalizedLocal.length > 64) {
        return { valid: false, error: "Email local part cannot exceed 64 characters." };
    }
    if (normalizedLocal.startsWith(".") || normalizedLocal.endsWith(".")) {
        return { valid: false, error: "Email cannot start or end with a dot." };
    }
    if (normalizedLocal.includes("..")) {
        return { valid: false, error: "Email cannot contain consecutive dots." };
    }

    // Local part allowed chars
    const localRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
    if (!localRegex.test(normalizedLocal)) {
        return { valid: false, error: "Email local part contains invalid characters." };
    }

    // Domain validation
    if (!domain || domain.length === 0) {
        return { valid: false, error: "Email domain cannot be empty." };
    }
    if (domain.length > 253) {
        return { valid: false, error: "Email domain cannot exceed 253 characters." };
    }
    if (domain.startsWith(".") || domain.endsWith(".")) {
        return { valid: false, error: "Email domain cannot start or end with a dot." };
    }
    if (domain.includes("..")) {
        return { valid: false, error: "Email domain cannot contain consecutive dots." };
    }

    const labels = domain.split(".");
    if (labels.length < 2) {
        return { valid: false, error: "Email domain must contain a valid top-level domain (e.g. .com)." };
    }

    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (label.length === 0) {
            return { valid: false, error: "Email domain contains empty labels." };
        }
        if (label.length > 63) {
            return { valid: false, error: "Email domain label exceeds maximum length of 63 characters." };
        }
        if (label.startsWith("-") || label.endsWith("-")) {
            return { valid: false, error: "Domain labels cannot begin or end with hyphens." };
        }

        // Each label must be alphanumeric or hyphen
        if (!/^[a-z0-9-]+$/i.test(label)) {
            return { valid: false, error: "Domain contains invalid characters." };
        }
    }

    // TLD validation (last label): minimum 2 characters, alphabetic only
    const tld = labels[labels.length - 1];
    if (tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
        return { valid: false, error: "Domain must contain a valid top-level domain with at least 2 letters." };
    }

    const normalizedEmail = `${normalizedLocal.toLowerCase()}@${domain}`;

    return {
        valid: true,
        email: normalizedEmail,
        localPart: normalizedLocal.toLowerCase(),
        domain: domain
    };
}

/**
 * Check if the domain is a known temporary/disposable email service
 */
function isDisposableEmail(domain) {
    if (!domain) return false;
    const cleanDomain = domain.toLowerCase().trim();
    if (DISPOSABLE_DOMAINS.has(cleanDomain)) return true;

    // Check subdomains of disposable services
    for (const disp of DISPOSABLE_DOMAINS) {
        if (cleanDomain.endsWith(`.${disp}`)) {
            return true;
        }
    }
    return false;
}

/**
 * Perform DNS MX and A/AAAA record verification for the email domain.
 * - Races both high-speed public DNS and local system DNS simultaneously (fastest wins)
 * - Recognizes known major providers if DNS experiences transient latency
 * - Validates MX records, with A/AAAA fallback for domains accepting direct mail
 * - 6-second timeout safeguard
 */
async function verifyDomainDns(domain, timeoutMs = 2500) {
    const cleanDomain = domain.toLowerCase().trim();

    // Fast-path: Established major email providers don't need network DNS lookups
    if (KNOWN_MAJOR_DOMAINS.has(cleanDomain)) {
        return { valid: true, isKnownProvider: true };
    }

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("DNS_TIMEOUT")), timeoutMs);
    });

    try {
        // Race system DNS and fastResolver simultaneously for maximum speed and resilience
        const mxRace = Promise.any([
            fastResolver.resolveMx(cleanDomain),
            dns.resolveMx(cleanDomain)
        ]);

        const mxRecords = await Promise.race([mxRace, timeoutPromise]);

        if (Array.isArray(mxRecords) && mxRecords.length > 0) {
            return { valid: true, mxRecords };
        }
    } catch (mxErr) {
        // If known major domain and hit transient network timeout, accept as valid
        if (isMajor) {
            return { valid: true, isKnownProvider: true };
        }

        if (mxErr.message === "DNS_TIMEOUT") {
            return {
                valid: false,
                timeout: true,
                error: "DNS lookup timed out while verifying email domain. Please try again."
            };
        }

        // AggregateError or individual DNS error
        const errors = mxErr.errors || [mxErr];
        const isNotFound = errors.every(
            (err) => err.code === "ENOTFOUND" || err.code === "ENODATA"
        );

        if (isNotFound) {
            // Check A / AAAA address records as fallback (RFC 5321 Section 5.1)
            try {
                const aRace = Promise.any([
                    fastResolver.resolve4(cleanDomain),
                    dns.resolve4(cleanDomain)
                ]);
                const aRecords = await Promise.race([aRace, timeoutPromise]);
                if (Array.isArray(aRecords) && aRecords.length > 0) {
                    return { valid: true, aRecords };
                }
            } catch (aErr) {
                try {
                    const aaaaRace = Promise.any([
                        fastResolver.resolve6(cleanDomain),
                        dns.resolve6(cleanDomain)
                    ]);
                    const aaaaRecords = await Promise.race([aaaaRace, timeoutPromise]);
                    if (Array.isArray(aaaaRecords) && aaaaRecords.length > 0) {
                        return { valid: true, aaaaRecords };
                    }
                } catch {
                    // Domain has neither MX nor A/AAAA records
                }
            }

            return {
                valid: false,
                error: "The email domain does not exist or cannot receive emails."
            };
        }

        // Check if OS getaddrinfo can resolve the host
        try {
            const lookupPromise = dns.lookup(cleanDomain);
            await Promise.race([lookupPromise, timeoutPromise]);
            return { valid: true };
        } catch {
            return {
                valid: false,
                error: "The email domain does not exist or cannot receive emails."
            };
        }
    }

    return {
        valid: false,
        error: "The email domain does not exist or cannot receive emails."
    };
}

/**
 * Check if the email address is already registered in PostgreSQL
 */
async function checkDuplicateEmail(email) {
    const normalized = email.toLowerCase().trim();
    const result = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [normalized]
    );
    return result.rows.length > 0;
}

/**
 * Full Email Validation Pipeline:
 * 1. Syntax & structure validation
 * 2. Disposable domain check
 * 3. Server-side DNS & MX/A record verification
 * 4. Duplicate database check (optional, default true)
 */
async function validateEmailFull(email, options = { checkDb: true }) {
    // 1. Syntax validation
    const syntax = validateEmailSyntax(email);
    if (!syntax.valid) {
        return { valid: false, error: syntax.error };
    }

    // 2. Disposable domain check
    if (isDisposableEmail(syntax.domain)) {
        return {
            valid: false,
            error: "Temporary or disposable email addresses are not permitted."
        };
    }

    // 3. DNS resolution check
    const dnsResult = await verifyDomainDns(syntax.domain);
    if (!dnsResult.valid) {
        return { valid: false, error: dnsResult.error };
    }

    // 4. Duplicate check in database
    if (options.checkDb) {
        const isDuplicate = await checkDuplicateEmail(syntax.email);
        if (isDuplicate) {
            return {
                valid: false,
                isDuplicate: true,
                error: "This email address is already registered."
            };
        }
    }

    return {
        valid: true,
        email: syntax.email,
        localPart: syntax.localPart,
        domain: syntax.domain
    };
}

module.exports = {
    validateEmailSyntax,
    isDisposableEmail,
    verifyDomainDns,
    checkDuplicateEmail,
    validateEmailFull
};
