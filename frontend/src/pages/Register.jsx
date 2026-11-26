import { useState, useEffect, useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useToast } from "../components/Toast";
import API from "../services/api";
import {
    validateName,
    validateEmail,
    validateMobile,
    validatePassword,
    validateConfirmPassword,
    getPasswordStrength
} from "../utils/validation";

function Register() {
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Step state: "form" (fill details) | "otp" (verify 6-digit email code)
    const [step, setStep] = useState("form");

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    const [touched, setTouched] = useState({
        name: false,
        email: false,
        phone: false,
        password: false,
        confirmPassword: false
    });

    const [errors, setErrors] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    const [generalError, setGeneralError] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailChecking, setEmailChecking] = useState(false);
    const [emailValidated, setEmailValidated] = useState(false);

    // Password visibility toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // OTP Verification states
    const [otpCode, setOtpCode] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [attemptsRemaining, setAttemptsRemaining] = useState(null);

    const otpInputRef = useRef(null);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Dynamic password strength assessment
    const passwordStrength = getPasswordStrength(form.password);

    // Countdown timer for OTP Resend
    useEffect(() => {
        let timer = null;
        if (step === "otp" && resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [step, resendCooldown]);

    // Auto-focus OTP input when switching to OTP step
    useEffect(() => {
        if (step === "otp" && otpInputRef.current) {
            otpInputRef.current.focus();
        }
    }, [step]);

    // Validate a specific field
    function validateField(field, value, allFormValues = form) {
        let error = "";

        switch (field) {
            case "name": {
                const res = validateName(value);
                if (!res.valid) error = res.error;
                break;
            }
            case "email": {
                const res = validateEmail(value);
                if (!res.valid) error = res.error;
                break;
            }
            case "phone": {
                const res = validateMobile(value);
                if (!res.valid) error = res.error;
                break;
            }
            case "password": {
                const res = validatePassword(value);
                if (!res.valid) error = res.error;
                break;
            }
            case "confirmPassword": {
                const res = validateConfirmPassword(allFormValues.password, value);
                if (!res.valid) error = res.error;
                break;
            }
            default:
                break;
        }

        setErrors((prev) => ({ ...prev, [field]: error }));
        return error;
    }

    function handleChange(field, rawValue) {
        let value = rawValue;

        // Enforce maximum length constraints - inputs will not accept characters beyond maximum length
        if (field === "name") {
            value = value.slice(0, 50);
        } else if (field === "phone") {
            // Strictly numeric digits, exactly max 10 digits
            value = value.replace(/\D/g, "").slice(0, 10);
        } else if (field === "email") {
            value = value.slice(0, 254);
        } else if (field === "password" || field === "confirmPassword") {
            value = value.slice(0, 64);
        }

        const nextForm = { ...form, [field]: value };
        setForm(nextForm);
        setGeneralError("");

        if (field === "email") {
            setEmailValidated(false);
        }

        // Clear error as user modifies field
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }

        // Real-time revalidation if field has already been touched
        if (touched[field]) {
            validateField(field, value, nextForm);
        }

        // If modifying password and confirmPassword was touched, recheck confirmPassword
        if (field === "password" && touched.confirmPassword) {
            validateField("confirmPassword", form.confirmPassword, nextForm);
        }
    }

    // On blur validation with server-side email verification
    async function handleBlur(field) {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const localErr = validateField(field, form[field], form);

        // If email syntax is valid, check server DNS/MX and duplicate in background
        if (field === "email" && !localErr && form.email.trim()) {
            setEmailChecking(true);
            try {
                const { data } = await API.post("/auth/validate-email", {
                    email: form.email.trim().toLowerCase()
                });
                if (data.valid) {
                    setEmailValidated(true);
                    setErrors((prev) => ({ ...prev, email: "" }));
                }
            } catch (err) {
                setEmailValidated(false);
                const errMsg = err.response?.data?.message || "Please enter a valid email address.";
                setErrors((prev) => ({ ...prev, email: errMsg }));
            } finally {
                setEmailChecking(false);
            }
        }
    }

    // Handle Form Submit: Validate details and send 6-digit OTP
    async function handleFormSubmit(e) {
        e.preventDefault();
        setGeneralError("");

        // Mark all fields as touched
        const allTouched = {
            name: true,
            email: true,
            phone: true,
            password: true,
            confirmPassword: true
        };
        setTouched(allTouched);

        const nameErr = validateField("name", form.name, form);
        const emailErr = validateField("email", form.email, form);
        const phoneErr = validateField("phone", form.phone, form);
        const passErr = validateField("password", form.password, form);
        const confirmPassErr = validateField("confirmPassword", form.confirmPassword, form);

        if (nameErr || emailErr || phoneErr || passErr || confirmPassErr) {
            showToast("Please correct the errors in the form before submitting.", "error");
            return;
        }

        setLoading(true);

        try {
            // Request 6-digit OTP from backend
            const cleanEmail = form.email.trim().toLowerCase();
            const { data } = await API.post("/auth/send-verification-otp", {
                email: cleanEmail
            });

            if (data.success) {
                showToast("Verification code sent to your email!", "success");
                setStep("otp");
                setOtpCode("");
                setOtpError("");
                setResendCooldown(data.cooldownSeconds || 60);
                setCanResend(false);
                setAttemptsRemaining(5);
            } else {
                setGeneralError(data.error || "Unable to send verification code.");
                showToast(data.error || "Unable to send verification code.", "error");
            }
        } catch (err) {
            const errorMsg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to send verification code. Please check your details.";
            setGeneralError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    }

    // Handle Resend OTP Code
    async function handleResendCode() {
        if (!canResend || loading) return;

        setLoading(true);
        setOtpError("");
        try {
            const cleanEmail = form.email.trim().toLowerCase();
            const { data } = await API.post("/auth/send-verification-otp", {
                email: cleanEmail
            });

            if (data.success) {
                showToast("A new verification code has been sent to your email.", "success");
                setResendCooldown(data.cooldownSeconds || 60);
                setCanResend(false);
                setAttemptsRemaining(5);
            } else {
                setOtpError(data.error || "Failed to resend code.");
            }
        } catch (err) {
            const errorMsg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to resend verification code.";
            setOtpError(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    // Handle OTP Submit & Complete Registration
    async function handleVerifyOtp(e) {
        e.preventDefault();
        setOtpError("");

        const cleanOtp = otpCode.trim();
        if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
            setOtpError("Please enter the complete 6-digit verification code.");
            return;
        }

        setOtpLoading(true);

        try {
            const cleanEmail = form.email.trim().toLowerCase();

            // 1. Verify OTP code with backend
            const verifyRes = await API.post("/auth/verify-email-otp", {
                email: cleanEmail,
                code: cleanOtp
            });

            if (!verifyRes.data.success) {
                const errMsg = verifyRes.data.error || "Invalid verification code.";
                setOtpError(errMsg);
                if (verifyRes.data.attemptsRemaining !== undefined) {
                    setAttemptsRemaining(verifyRes.data.attemptsRemaining);
                }
                setOtpLoading(false);
                return;
            }

            // 2. Finalize registration now that email is verified
            await register({
                name: form.name.trim().replace(/\s+/g, " "),
                email: cleanEmail,
                phone: form.phone.replace(/[\s\-()]/g, ""),
                password: form.password
            });

            showToast("Account created successfully! Welcome to Expense Tracker.", "success");
            navigate("/");
        } catch (err) {
            const errorMsg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Verification failed. Please check the code and try again.";
            setOtpError(errorMsg);
            if (err.response?.data?.attemptsRemaining !== undefined) {
                setAttemptsRemaining(err.response.data.attemptsRemaining);
            }
            showToast(errorMsg, "error");
        } finally {
            setOtpLoading(false);
        }
    }

    // Validation status helpers for UI styling
    const isValid = (field) => touched[field] && !errors[field] && String(form[field]).trim() !== "";
    const isInvalid = (field) => touched[field] && Boolean(errors[field]);

    return (
        <div className="auth-pure-canvas py-4">
            <div className="auth-pure-card" style={{ maxWidth: "480px" }}>
                {step === "form" ? (
                    <>
                        {/* Brand Logo & Header */}
                        <div className="text-center mb-4">
                            <div className="d-inline-flex align-items-center justify-content-center mb-3">
                                <div className="auth-brand-icon">
                                    <i className="bi bi-wallet2"></i>
                                </div>
                            </div>
                            <h2 className="auth-pure-title">Create an Account</h2>
                            <p className="auth-pure-subtitle">Start tracking your expenses and dynamic passbook ledger.</p>
                        </div>

                        {/* General Error Banner */}
                        {generalError && (
                            <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                                <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                                <span>{generalError}</span>
                            </div>
                        )}

                        {/* Registration Form */}
                        <form onSubmit={handleFormSubmit} noValidate>
                            {/* 1. Full Name */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted mb-1">Full Name</label>
                                <div
                                    className={`input-group input-group-auth ${
                                        isInvalid("name") ? "is-invalid" : isValid("name") ? "is-valid" : ""
                                    }`}
                                >
                                    <span className="input-group-text auth-input-icon">
                                        <i className="bi bi-person"></i>
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control auth-input-field"
                                        placeholder="Enter your full name"
                                        required
                                        maxLength={50}
                                        value={form.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        onBlur={() => handleBlur("name")}
                                        disabled={loading}
                                    />
                                    {isValid("name") && (
                                        <span className="auth-valid-icon" title="Valid name">
                                            <i className="bi bi-check-circle-fill"></i>
                                        </span>
                                    )}
                                </div>
                                {isInvalid("name") && (
                                    <div className="auth-field-error">
                                        <i className="bi bi-exclamation-circle-fill"></i>
                                        <span>{errors.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* 2. Email Address (No example emails in placeholder) */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted mb-1">Email Address</label>
                                <div
                                    className={`input-group input-group-auth ${
                                        isInvalid("email") ? "is-invalid" : isValid("email") && emailValidated ? "is-valid" : ""
                                    }`}
                                >
                                    <span className="input-group-text auth-input-icon">
                                        <i className="bi bi-envelope"></i>
                                    </span>
                                    <input
                                        type="email"
                                        className="form-control auth-input-field"
                                        placeholder="Enter your email address"
                                        required
                                        maxLength={254}
                                        value={form.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        onBlur={() => handleBlur("email")}
                                        disabled={loading}
                                    />
                                    {emailChecking && (
                                        <span className="auth-valid-icon text-muted" title="Verifying domain...">
                                            <span className="spinner-border spinner-border-sm" role="status"></span>
                                        </span>
                                    )}
                                    {!emailChecking && isValid("email") && emailValidated && (
                                        <span className="auth-valid-icon" title="Email address verified">
                                            <i className="bi bi-check-circle-fill"></i>
                                        </span>
                                    )}
                                </div>
                                {isInvalid("email") && (
                                    <div className="auth-field-error">
                                        <i className="bi bi-exclamation-circle-fill"></i>
                                        <span>{errors.email}</span>
                                    </div>
                                )}
                            </div>

                            {/* 3. Mobile Number Input (10-Digit Indian) */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted mb-1">
                                    Mobile Number (For P2P Payments)
                                </label>
                                <div
                                    className={`input-group input-group-auth ${
                                        isInvalid("phone") ? "is-invalid" : isValid("phone") ? "is-valid" : ""
                                    }`}
                                >
                                    <span className="input-group-text auth-input-icon">
                                        <i className="bi bi-telephone"></i>
                                    </span>
                                    <span className="input-group-text bg-transparent border-0 ps-0 pe-2 text-muted fw-bold">+91</span>
                                    <input
                                        type="tel"
                                        className="form-control auth-input-field ps-1"
                                        placeholder="10-digit mobile number"
                                        required
                                        maxLength={10}
                                        value={form.phone}
                                        onChange={(e) => handleChange("phone", e.target.value)}
                                        onBlur={() => handleBlur("phone")}
                                        disabled={loading}
                                    />
                                    {isValid("phone") && (
                                        <span className="auth-valid-icon" title="Valid 10-digit Indian number">
                                            <i className="bi bi-check-circle-fill"></i>
                                        </span>
                                    )}
                                </div>
                                {isInvalid("phone") && (
                                    <div className="auth-field-error">
                                        <i className="bi bi-exclamation-circle-fill"></i>
                                        <span>{errors.phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* 4. Password Input with Strength Indicator */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted mb-1">Password</label>
                                <div
                                    className={`input-group input-group-auth ${
                                        isInvalid("password")
                                            ? "is-invalid"
                                            : isValid("password")
                                            ? "is-valid"
                                            : ""
                                    }`}
                                >
                                    <span className="input-group-text auth-input-icon">
                                        <i className="bi bi-shield-lock"></i>
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control auth-input-field"
                                        placeholder="Choose a strong password"
                                        required
                                        maxLength={64}
                                        value={form.password}
                                        onChange={(e) => handleChange("password", e.target.value)}
                                        onBlur={() => handleBlur("password")}
                                        disabled={loading}
                                    />
                                    {isValid("password") && (
                                        <span className="auth-valid-icon" title="Valid password">
                                            <i className="bi bi-check-circle-fill"></i>
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="btn auth-input-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? "Hide password" : "Show password"}
                                        tabIndex="-1"
                                    >
                                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                                    </button>
                                </div>
                                {isInvalid("password") && (
                                    <div className="auth-field-error">
                                        <i className="bi bi-exclamation-circle-fill"></i>
                                        <span>{errors.password}</span>
                                    </div>
                                )}

                                {/* Password Strength Meter & Policy Rules */}
                                {form.password && (
                                    <div className="password-strength-container mt-2">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                                                Password Strength:
                                            </span>
                                            <span
                                                className="fw-bold small"
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color:
                                                        passwordStrength.level === "Strong"
                                                            ? "#10B981"
                                                            : passwordStrength.level === "Medium"
                                                            ? "#F59E0B"
                                                            : "#EF4444"
                                                }}
                                            >
                                                {passwordStrength.level}
                                            </span>
                                        </div>
                                        <div className="progress" style={{ height: "5px", backgroundColor: "#E2E8F0", borderRadius: "999px", overflow: "hidden" }}>
                                            <div
                                                className={`progress-bar ${
                                                    passwordStrength.level === "Strong"
                                                        ? "bg-success"
                                                        : passwordStrength.level === "Medium"
                                                        ? "bg-warning"
                                                        : "bg-danger"
                                                }`}
                                                role="progressbar"
                                                style={{
                                                    width: `${passwordStrength.score}%`,
                                                    transition: "width 0.3s ease, background-color 0.3s ease"
                                                }}
                                                aria-valuenow={passwordStrength.score}
                                                aria-valuemin="0"
                                                aria-valuemax="100"
                                            ></div>
                                        </div>

                                        {/* Dynamic Policy Checklist according to validation rules */}
                                        <div className="password-rules-badges mt-2 d-flex flex-wrap gap-1">
                                            <span
                                                className={`badge rounded-pill ${
                                                    passwordStrength.rules?.length
                                                        ? "bg-success-subtle text-success border border-success-subtle"
                                                        : "bg-light text-muted border border-light-subtle"
                                                }`}
                                                style={{ fontSize: "0.68rem", fontWeight: 500 }}
                                            >
                                                <i className={`bi ${passwordStrength.rules?.length ? "bi-check2" : "bi-circle"} me-1`}></i>
                                                8-64 chars
                                            </span>
                                            <span
                                                className={`badge rounded-pill ${
                                                    passwordStrength.rules?.upper
                                                        ? "bg-success-subtle text-success border border-success-subtle"
                                                        : "bg-light text-muted border border-light-subtle"
                                                }`}
                                                style={{ fontSize: "0.68rem", fontWeight: 500 }}
                                            >
                                                <i className={`bi ${passwordStrength.rules?.upper ? "bi-check2" : "bi-circle"} me-1`}></i>
                                                1 uppercase
                                            </span>
                                            <span
                                                className={`badge rounded-pill ${
                                                    passwordStrength.rules?.lower
                                                        ? "bg-success-subtle text-success border border-success-subtle"
                                                        : "bg-light text-muted border border-light-subtle"
                                                }`}
                                                style={{ fontSize: "0.68rem", fontWeight: 500 }}
                                            >
                                                <i className={`bi ${passwordStrength.rules?.lower ? "bi-check2" : "bi-circle"} me-1`}></i>
                                                1 lowercase
                                            </span>
                                            <span
                                                className={`badge rounded-pill ${
                                                    passwordStrength.rules?.number
                                                        ? "bg-success-subtle text-success border border-success-subtle"
                                                        : "bg-light text-muted border border-light-subtle"
                                                }`}
                                                style={{ fontSize: "0.68rem", fontWeight: 500 }}
                                            >
                                                <i className={`bi ${passwordStrength.rules?.number ? "bi-check2" : "bi-circle"} me-1`}></i>
                                                1 number
                                            </span>
                                            <span
                                                className={`badge rounded-pill ${
                                                    passwordStrength.rules?.special
                                                        ? "bg-success-subtle text-success border border-success-subtle"
                                                        : "bg-light text-muted border border-light-subtle"
                                                }`}
                                                style={{ fontSize: "0.68rem", fontWeight: 500 }}
                                            >
                                                <i className={`bi ${passwordStrength.rules?.special ? "bi-check2" : "bi-circle"} me-1`}></i>
                                                1 special char
                                            </span>
                                            <span
                                                className={`badge rounded-pill ${
                                                    passwordStrength.rules?.noSpaces
                                                        ? "bg-success-subtle text-success border border-success-subtle"
                                                        : "bg-danger-subtle text-danger border border-danger-subtle"
                                                }`}
                                                style={{ fontSize: "0.68rem", fontWeight: 500 }}
                                            >
                                                <i className={`bi ${passwordStrength.rules?.noSpaces ? "bi-check2" : "bi-x"} me-1`}></i>
                                                no spaces
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 5. Confirm Password */}
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted mb-1">
                                    Confirm Password
                                </label>
                                <div
                                    className={`input-group input-group-auth ${
                                        isInvalid("confirmPassword")
                                            ? "is-invalid"
                                            : isValid("confirmPassword")
                                            ? "is-valid"
                                            : ""
                                    }`}
                                >
                                    <span className="input-group-text auth-input-icon">
                                        <i className="bi bi-shield-check"></i>
                                    </span>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        className="form-control auth-input-field"
                                        placeholder="Confirm your password"
                                        required
                                        maxLength={64}
                                        value={form.confirmPassword}
                                        onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                        onBlur={() => handleBlur("confirmPassword")}
                                        disabled={loading}
                                    />
                                    {isValid("confirmPassword") && (
                                        <span className="auth-valid-icon" title="Passwords match">
                                            <i className="bi bi-check-circle-fill"></i>
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="btn auth-input-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        title={showConfirmPassword ? "Hide password" : "Show password"}
                                        tabIndex="-1"
                                    >
                                        <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                                    </button>
                                </div>
                                {isInvalid("confirmPassword") && (
                                    <div className="auth-field-error">
                                        <i className="bi bi-exclamation-circle-fill"></i>
                                        <span>{errors.confirmPassword}</span>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn btn-auth-pill"
                                disabled={loading || emailChecking}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        <span>Sending Verification Code...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Verify Email & Create Account</span>
                                        <i className="bi bi-arrow-right ms-2"></i>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Switch to Login */}
                        <p className="text-center text-muted mt-4 mb-0 small">
                            Already have an account?{" "}
                            <Link to="/login" className="fw-bold text-decoration-none text-primary">
                                Sign in
                            </Link>
                        </p>
                    </>
                ) : (
                    /* Step 2: Email OTP Verification View */
                    <div>
                        {/* Header */}
                        <div className="text-center mb-4">
                            <div className="d-inline-flex align-items-center justify-content-center mb-3">
                                <div
                                    className="auth-brand-icon"
                                    style={{
                                        background: "linear-gradient(135deg, #10B981, #059669)",
                                        boxShadow: "0 8px 20px rgba(16, 185, 129, 0.28)"
                                    }}
                                >
                                    <i className="bi bi-shield-check text-white"></i>
                                </div>
                            </div>
                            <h2 className="auth-pure-title">Verify Your Email</h2>
                            <p className="auth-pure-subtitle mb-1">
                                We sent a 6-digit verification code to
                            </p>
                            <div className="d-flex align-items-center justify-content-center gap-2 mt-1">
                                <span className="fw-bold text-dark">{form.email}</span>
                                <button
                                    type="button"
                                    className="btn btn-link p-0 text-decoration-none small text-primary"
                                    onClick={() => setStep("form")}
                                    style={{ fontSize: "0.85rem" }}
                                    title="Edit Email Address"
                                >
                                    <i className="bi bi-pencil-square me-1"></i>Edit
                                </button>
                            </div>
                        </div>

                        {/* OTP Error Banner */}
                        {otpError && (
                            <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                                <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                                <span>{otpError}</span>
                            </div>
                        )}

                        <form onSubmit={handleVerifyOtp} noValidate>
                            {/* 6-Digit OTP Input */}
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted mb-2 text-center d-block">
                                    Enter 6-Digit Verification Code
                                </label>
                                <div className="d-flex justify-content-center">
                                    <input
                                        ref={otpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        className="form-control text-center fw-bold"
                                        placeholder="••••••"
                                        value={otpCode}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                            setOtpCode(val);
                                            setOtpError("");
                                        }}
                                        style={{
                                            maxWidth: "280px",
                                            height: "56px",
                                            fontSize: "28px",
                                            letterSpacing: "12px",
                                            fontFamily: "monospace",
                                            borderRadius: "12px",
                                            border: "2px solid #cbd5e1",
                                            backgroundColor: "#f8fafc"
                                        }}
                                        disabled={otpLoading}
                                    />
                                </div>
                                <div className="text-center mt-2">
                                    <small className="text-muted" style={{ fontSize: "0.78rem" }}>
                                        Code expires in 5 minutes.
                                    </small>
                                </div>
                            </div>

                            {/* Verify Button */}
                            <button
                                type="submit"
                                className="btn btn-auth-pill mb-3"
                                disabled={otpLoading || otpCode.trim().length !== 6}
                            >
                                {otpLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        <span>Verifying & Creating Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check2-circle me-2"></i>
                                        <span>Confirm & Register</span>
                                    </>
                                )}
                            </button>

                            {/* Resend Code Section */}
                            <div className="text-center mt-3 pt-2 border-top">
                                {canResend ? (
                                    <button
                                        type="button"
                                        className="btn btn-link p-0 text-decoration-none fw-bold small text-primary"
                                        onClick={handleResendCode}
                                        disabled={loading}
                                    >
                                        <i className="bi bi-arrow-clockwise me-1"></i>Resend Verification Code
                                    </button>
                                ) : (
                                    <span className="text-muted small">
                                        <i className="bi bi-clock me-1"></i>
                                        Resend code in <strong className="text-dark">{resendCooldown}s</strong>
                                    </span>
                                )}
                            </div>

                            {/* Back to details */}
                            <div className="text-center mt-3">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1"
                                    onClick={() => setStep("form")}
                                    disabled={otpLoading}
                                    style={{ fontSize: "0.82rem" }}
                                >
                                    <i className="bi bi-arrow-left me-1"></i>Back to Form
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Register;
