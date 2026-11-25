const nodemailer = require("nodemailer");

/**
 * Configure Nodemailer Transporter using environment variables.
 * Safe fallback: If SMTP is unconfigured, logs the OTP clearly to console.
 */
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
    const secure = process.env.EMAIL_SECURE === "true" || port === 465;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (user && pass) {
        transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass }
        });
    }

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
 * Send 6-digit OTP to the user's email address
 */
async function sendOTPEmail(toEmail, otp) {
    const fromAddress = process.env.EMAIL_FROM || '"Expense Tracker" <no-reply@expensetracker.com>';
    const mailOptions = {
        from: fromAddress,
        to: toEmail,
        subject: `${otp} is your Expense Tracker verification code`,
        text: `Your Expense Tracker verification code is: ${otp}\n\nThis code will expire in 5 minutes. Do not share this code with anyone.`,
        html: generateOTPEmailHtml(otp, 5)
    };

    const client = getTransporter();

    if (client) {
        try {
            const info = await client.sendMail(mailOptions);
            console.log(`[Email Service] Verification OTP email sent to ${toEmail} (MessageId: ${info.messageId})`);
            return { sent: true, mode: "smtp", messageId: info.messageId };
        } catch (error) {
            console.error(`[Email Service] Failed to send email via SMTP:`, error.message);
            // Log fallback to console so testing is not blocked
            console.log("\n=======================================================");
            console.log(`[EMAIL FALLBACK] OTP for ${toEmail}: >>> ${otp} <<<`);
            console.log("=======================================================\n");
            return { sent: true, mode: "fallback_console", warning: "SMTP send failed, logged to console" };
        }
    } else {
        // SMTP not configured - log clearly in dev console
        console.log("\n=======================================================");
        console.log(`[EMAIL DEV MODE] SMTP unconfigured. Verification code:`);
        console.log(`Recipient: ${toEmail}`);
        console.log(`OTP Code : >>> ${otp} <<<`);
        console.log(`Expires  : in 5 minutes`);
        console.log("=======================================================\n");
        return { sent: true, mode: "console" };
    }
}

module.exports = {
    sendOTPEmail,
    generateOTPEmailHtml
};
