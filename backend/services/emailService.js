const nodemailer = require("nodemailer");

/**
 * Configure Nodemailer Transporter using environment variables.
 * Uses IPv4 (family: 4) to prevent IPv6 routing timeouts on cloud platforms like Render.
 */
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
    const rawPass = process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.trim() : "";
    const pass = rawPass.replace(/\s+/g, "");

    if (!user || !pass) {
        return null;
    }

    const host = (process.env.EMAIL_HOST || "smtp.gmail.com").trim().toLowerCase();
    const port = parseInt(process.env.EMAIL_PORT, 10) || 465;
    const isGmail = host.includes("gmail");

    transporter = nodemailer.createTransport({
        host: isGmail ? "smtp.gmail.com" : host,
        port: port,
        secure: port === 465,
        family: 4, // CRITICAL: Forces IPv4 to eliminate IPv6 network delays/hangs on Render
        auth: { user, pass },
        connectionTimeout: 15000, // 15s connection timeout
        greetingTimeout: 15000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false
        }
    });

    return transporter;
}

/**
 * Generate a professional HTML email template for the OTP code
 */
function generateOTPEmailHtml(otp, expiryMinutes = 5) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Expense Tracker Email Verification</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
            .container { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 32px 28px; text-align: center; }
            .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1e293b; margin: 0; font-family: monospace; }
            .badge { display: inline-block; background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
            .info-text { color: #64748b; font-size: 14px; line-height: 1.6; margin: 16px 0; }
            .security-warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; text-align: left; font-size: 13px; color: #92400e; margin-top: 24px; }
            .footer { padding: 20px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Expense Tracker</h1>
                <p>Email Verification</p>
            </div>
            <div class="content">
                <span class="badge">Valid for ${expiryMinutes} minutes</span>
                <p class="info-text">Please enter the 6-digit verification code below to verify your email address and complete registration:</p>
                <div class="otp-box">
                    <div class="otp-code">${otp}</div>
                </div>
                <div class="security-warning">
                    <strong>Security Notice:</strong> Do not share this one-time code with anyone. Expense Tracker staff will never ask for your verification code.
                </div>
            </div>
            <div class="footer">
                If you did not request this email, please ignore it.<br>
                &copy; ${new Date().getFullYear()} Expense Tracker. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Send email via Brevo HTTP API (Port 443 HTTPS - No recipient restrictions!)
 */
async function sendViaBrevo(toEmail, otp) {
    const brevoKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : null;
    if (!brevoKey) return null;

    try {
        const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || "harishvp31@gmail.com";
        const senderName = "Expense Tracker";

        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": brevoKey,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                sender: { name: senderName, email: senderEmail },
                to: [{ email: toEmail }],
                subject: `${otp} is your Expense Tracker verification code`,
                htmlContent: generateOTPEmailHtml(otp, 5),
                textContent: `Your Expense Tracker verification code is: ${otp}\n\nThis code will expire in 5 minutes. Do not share this code with anyone.`
            })
        });

        const data = await response.json();
        if (response.ok && (data.messageId || data.messageIds)) {
            const id = data.messageId || (data.messageIds && data.messageIds[0]);
            console.log(`[Email Service] Verification OTP email sent via Brevo to ${toEmail} (Id: ${id})`);
            return { sent: true, mode: "brevo", messageId: id };
        } else {
            console.error(`[Email Service] Brevo API error:`, data);
            return null;
        }
    } catch (err) {
        console.error(`[Email Service] Brevo network error:`, err.message);
        return null;
    }
}

/**
 * Send email via Resend HTTP API
 */
async function sendViaResend(toEmail, otp) {
    const resendKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;
    if (!resendKey) return null;

    try {
        let fromAddress = "Expense Tracker <onboarding@resend.dev>";
        if (process.env.RESEND_FROM) {
            fromAddress = process.env.RESEND_FROM;
        } else if (
            process.env.EMAIL_FROM &&
            !process.env.EMAIL_FROM.includes("@gmail.com") &&
            !process.env.EMAIL_FROM.includes("@yahoo.") &&
            !process.env.EMAIL_FROM.includes("@hotmail.") &&
            !process.env.EMAIL_FROM.includes("@outlook.")
        ) {
            fromAddress = process.env.EMAIL_FROM;
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: fromAddress,
                to: [toEmail],
                subject: `${otp} is your Expense Tracker verification code`,
                text: `Your Expense Tracker verification code is: ${otp}\n\nThis code will expire in 5 minutes. Do not share this code with anyone.`,
                html: generateOTPEmailHtml(otp, 5)
            })
        });

        const data = await response.json();
        if (response.ok && data.id) {
            console.log(`[Email Service] Verification OTP email sent via Resend to ${toEmail} (Id: ${data.id})`);
            return { sent: true, mode: "resend", messageId: data.id };
        } else {
            console.warn(`[Email Service] Resend API error (${data.name || "error"}):`, data.message);
            // Return null so it cascades seamlessly to Brevo or Gmail SMTP
            return null;
        }
    } catch (err) {
        console.warn(`[Email Service] Resend network error:`, err.message);
        return null;
    }
}

/**
 * Send email via Nodemailer SMTP with IPv4 and direct TLS
 */
async function sendViaSMTP(toEmail, otp) {
    const client = getTransporter();
    if (!client) return null;

    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Expense Tracker" <no-reply@expensetracker.com>';
    const mailOptions = {
        from: fromAddress,
        to: toEmail,
        subject: `${otp} is your Expense Tracker verification code`,
        text: `Your Expense Tracker verification code is: ${otp}\n\nThis code will expire in 5 minutes. Do not share this code with anyone.`,
        html: generateOTPEmailHtml(otp, 5)
    };

    try {
        const sendPromise = client.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SMTP connection timed out after 14 seconds")), 14000)
        );

        const info = await Promise.race([sendPromise, timeoutPromise]);
        console.log(`[Email Service] Verification OTP email sent via SMTP to ${toEmail} (MessageId: ${info.messageId})`);
        return { sent: true, mode: "smtp", messageId: info.messageId };
    } catch (error) {
        console.error(`[Email Service] Failed to send email via SMTP:`, error.message);
        return null;
    }
}

/**
 * Multi-Provider Email Dispatcher:
 * Automatically tries available providers without blocking registration:
 * 1. Brevo HTTP API (if BREVO_API_KEY is configured - completely free, sends to ANY recipient)
 * 2. Resend HTTP API (if RESEND_API_KEY is configured)
 * 3. Nodemailer SMTP (Gmail / IPv4 forced)
 * 4. Safe Console logging fallback
 */
async function sendOTPEmail(toEmail, otp) {
    // 1. Try Brevo HTTP API first if configured (No recipient restrictions!)
    const brevoResult = await sendViaBrevo(toEmail, otp);
    if (brevoResult) return brevoResult;

    // 2. Try Resend HTTP API
    const resendResult = await sendViaResend(toEmail, otp);
    if (resendResult) return resendResult;

    // 3. Try Nodemailer SMTP (IPv4 forced on port 465)
    const smtpResult = await sendViaSMTP(toEmail, otp);
    if (smtpResult) return smtpResult;

    // 4. Safe Console Fallback so testing is never blocked
    console.log("\n=======================================================");
    console.log(`[EMAIL FALLBACK] OTP for ${toEmail}: >>> ${otp} <<<`);
    console.log(`Notice: To deliver emails to any address, configure BREVO_API_KEY or EMAIL_USER/EMAIL_PASSWORD`);
    console.log("=======================================================\n");
    return { sent: true, mode: "fallback_console", warning: "Logged to console" };
}

module.exports = {
    sendOTPEmail,
    generateOTPEmailHtml
};
