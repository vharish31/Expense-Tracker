import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useToast } from "../components/Toast";
import {
    validateName,
    validateEmail,
    validateMobile,
    validatePassword,
    getPasswordStrength,
    validatePaymentPin,
    validateConfirmPin
} from "../utils/validation";

function Register() {
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        pin: "",
        confirmPin: ""
    });

    const [touched, setTouched] = useState({
        name: false,
        email: false,
        phone: false,
        password: false,
        pin: false,
        confirmPin: false
    });

    const [errors, setErrors] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        pin: "",
        confirmPin: ""
    });

    const [generalError, setGeneralError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Dynamic password strength assessment
    const passwordStrength = getPasswordStrength(form.password);

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
            case "pin": {
                const res = validatePaymentPin(value);
                if (!res.valid) error = res.error;
                break;
            }
            case "confirmPin": {
                const res = validateConfirmPin(allFormValues.pin, value);
                if (!res.valid) error = res.error;
                break;
            }
            default:
                break;
        }

        setErrors((prev) => ({ ...prev, [field]: error }));
        return error;
    }

    function handleChange(field, value) {
        const nextForm = { ...form, [field]: value };
        setForm(nextForm);
        setGeneralError("");

        // Clear error as user modifies field
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }

        // Real-time revalidation if field has already been touched
        if (touched[field]) {
            validateField(field, value, nextForm);
        }

        // If modifying pin and confirmPin was touched, recheck confirmPin
        if (field === "pin" && touched.confirmPin) {
            validateField("confirmPin", form.confirmPin, nextForm);
        }
    }

    function handleBlur(field) {
        setTouched((prev) => ({ ...prev, [field]: true }));
        validateField(field, form[field], form);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setGeneralError("");

        // Mark all fields as touched
        const allTouched = {
            name: true,
            email: true,
            phone: true,
            password: true,
            pin: true,
            confirmPin: true
        };
        setTouched(allTouched);

        const nameErr = validateField("name", form.name, form);
        const emailErr = validateField("email", form.email, form);
        const phoneErr = validateField("phone", form.phone, form);
        const passErr = validateField("password", form.password, form);
        const pinErr = validateField("pin", form.pin, form);
        const confirmPinErr = validateField("confirmPin", form.confirmPin, form);

        if (nameErr || emailErr || phoneErr || passErr || pinErr || confirmPinErr) {
            showToast("Please correct the errors in the form before submitting.", "error");
            return;
        }

        setLoading(true);

        try {
            await register({
                name: form.name.trim().replace(/\s+/g, " "),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.replace(/[\s\-()]/g, ""),
                password: form.password,
                pin: form.pin.trim()
            });

            showToast("Account created successfully! Welcome to FinTrack.", "success");
            navigate("/");
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                "Could not complete registration. Please verify details.";
            setGeneralError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    }

    // Validation status helpers for UI styling
    const isValid = (field) => touched[field] && !errors[field] && String(form[field]).trim() !== "";
    const isInvalid = (field) => touched[field] && Boolean(errors[field]);

    return (
        <div className="auth-pure-canvas py-4">
            <div className="auth-pure-card" style={{ maxWidth: "480px" }}>
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
                <form onSubmit={handleSubmit} noValidate>
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

                    {/* 2. Email Address */}
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted mb-1">Email Address</label>
                        <div
                            className={`input-group input-group-auth ${
                                isInvalid("email") ? "is-invalid" : isValid("email") ? "is-valid" : ""
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
                                value={form.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                onBlur={() => handleBlur("email")}
                                disabled={loading}
                            />
                            {isValid("email") && (
                                <span className="auth-valid-icon" title="Valid email format">
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
                                maxLength={14}
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
                                isInvalid("password") ? "is-invalid" : isValid("password") ? "is-valid" : ""
                            }`}
                        >
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-lock"></i>
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control auth-input-field"
                                placeholder="Create a strong password"
                                required
                                value={form.password}
                                onChange={(e) => handleChange("password", e.target.value)}
                                onBlur={() => handleBlur("password")}
                                disabled={loading}
                            />
                            {isValid("password") && (
                                <span className="auth-valid-icon" title="Password meets policy">
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

                        {/* Password Strength Meter */}
                        {form.password && (
                            <div className="mt-2">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                                        Password Strength
                                    </span>
                                    <span
                                        className="fw-bold"
                                        style={{ fontSize: "0.75rem", color: passwordStrength.color }}
                                    >
                                        {passwordStrength.label}
                                    </span>
                                </div>
                                <div className="strength-bar-container">
                                    <div
                                        className="strength-bar-fill"
                                        style={{
                                            width: `${passwordStrength.percent}%`,
                                            backgroundColor: passwordStrength.color
                                        }}
                                    ></div>
                                </div>
                                <div className="d-flex flex-wrap gap-2 mt-2" style={{ fontSize: "0.7rem" }}>
                                    <span className={passwordStrength.checks?.length ? "text-success fw-semibold" : "text-muted"}>
                                        <i className={`bi ${passwordStrength.checks?.length ? "bi-check-circle-fill" : "bi-circle"} me-1`}></i>
                                        8+ chars
                                    </span>
                                    <span className={passwordStrength.checks?.upper ? "text-success fw-semibold" : "text-muted"}>
                                        <i className={`bi ${passwordStrength.checks?.upper ? "bi-check-circle-fill" : "bi-circle"} me-1`}></i>
                                        Uppercase
                                    </span>
                                    <span className={passwordStrength.checks?.lower ? "text-success fw-semibold" : "text-muted"}>
                                        <i className={`bi ${passwordStrength.checks?.lower ? "bi-check-circle-fill" : "bi-circle"} me-1`}></i>
                                        Lowercase
                                    </span>
                                    <span className={passwordStrength.checks?.number ? "text-success fw-semibold" : "text-muted"}>
                                        <i className={`bi ${passwordStrength.checks?.number ? "bi-check-circle-fill" : "bi-circle"} me-1`}></i>
                                        Number
                                    </span>
                                    <span className={passwordStrength.checks?.special ? "text-success fw-semibold" : "text-muted"}>
                                        <i className={`bi ${passwordStrength.checks?.special ? "bi-check-circle-fill" : "bi-circle"} me-1`}></i>
                                        Special symbol
                                    </span>
                                </div>
                            </div>
                        )}

                        {isInvalid("password") && (
                            <div className="auth-field-error">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                <span>{errors.password}</span>
                            </div>
                        )}
                    </div>

                    {/* 5. Four-Digit Security PIN */}
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label small fw-bold text-muted mb-0">
                                4-Digit Payment Security PIN
                            </label>
                            <span className="badge bg-light text-primary border small" style={{ fontSize: "0.7rem" }}>
                                Transfers
                            </span>
                        </div>
                        <div
                            className={`input-group input-group-auth ${
                                isInvalid("pin") ? "is-invalid" : isValid("pin") ? "is-valid" : ""
                            }`}
                        >
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-shield-lock"></i>
                            </span>
                            <input
                                type={showPin ? "text" : "password"}
                                className="form-control auth-input-field"
                                placeholder="••••"
                                required
                                maxLength={4}
                                inputMode="numeric"
                                value={form.pin}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    handleChange("pin", val);
                                }}
                                onBlur={() => handleBlur("pin")}
                                disabled={loading}
                            />
                            {isValid("pin") && (
                                <span className="auth-valid-icon" title="Valid secure PIN">
                                    <i className="bi bi-check-circle-fill"></i>
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn auth-input-toggle"
                                onClick={() => setShowPin(!showPin)}
                                title={showPin ? "Hide PIN" : "Show PIN"}
                                tabIndex="-1"
                            >
                                <i className={`bi ${showPin ? "bi-eye-slash" : "bi-eye"}`}></i>
                            </button>
                        </div>
                        {isInvalid("pin") ? (
                            <div className="auth-field-error">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                <span>{errors.pin}</span>
                            </div>
                        ) : (
                            <small className="text-muted d-block mt-1" style={{ fontSize: "0.74rem" }}>
                                4 numeric digits. Avoid simple sequences (1234) or repeated digits (1111).
                            </small>
                        )}
                    </div>

                    {/* 7. Confirm 4-Digit Security PIN */}
                    <div className="mb-4">
                        <label className="form-label small fw-bold text-muted mb-1">
                            Confirm 4-Digit Payment PIN
                        </label>
                        <div
                            className={`input-group input-group-auth ${
                                isInvalid("confirmPin")
                                    ? "is-invalid"
                                    : isValid("confirmPin")
                                    ? "is-valid"
                                    : ""
                            }`}
                        >
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-key"></i>
                            </span>
                            <input
                                type={showConfirmPin ? "text" : "password"}
                                className="form-control auth-input-field"
                                placeholder="••••"
                                required
                                maxLength={4}
                                inputMode="numeric"
                                value={form.confirmPin}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    handleChange("confirmPin", val);
                                }}
                                onBlur={() => handleBlur("confirmPin")}
                                disabled={loading}
                            />
                            {isValid("confirmPin") && (
                                <span className="auth-valid-icon" title="PINs match">
                                    <i className="bi bi-check-circle-fill"></i>
                                </span>
                            )}
                            <button
                                type="button"
                                className="btn auth-input-toggle"
                                onClick={() => setShowConfirmPin(!showConfirmPin)}
                                title={showConfirmPin ? "Hide PIN" : "Show PIN"}
                                tabIndex="-1"
                            >
                                <i className={`bi ${showConfirmPin ? "bi-eye-slash" : "bi-eye"}`}></i>
                            </button>
                        </div>
                        {isInvalid("confirmPin") && (
                            <div className="auth-field-error">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                <span>{errors.confirmPin}</span>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-auth-pill"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <span>Create Account</span>
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
            </div>
        </div>
    );
}

export default Register;
