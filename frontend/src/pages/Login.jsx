import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import { useToast } from "../components/Toast";
import { validateEmail } from "../utils/validation";

function Login() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({ email: "", password: "" });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [errors, setErrors] = useState({ email: "", password: "" });
    const [generalError, setGeneralError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Validate a specific field
    function validateField(field, value) {
        let error = "";

        if (field === "email") {
            if (!value || value.trim() === "") {
                error = "Please enter your email address.";
            } else {
                const res = validateEmail(value);
                if (!res.valid) {
                    error = res.error;
                }
            }
        } else if (field === "password") {
            if (!value || value === "") {
                error = "Please enter your password.";
            }
        }

        setErrors((prev) => ({ ...prev, [field]: error }));
        return error;
    }

    function handleChange(field, rawValue) {
        let value = rawValue;
        if (field === "email") {
            value = value.slice(0, 254);
        } else if (field === "password") {
            value = value.slice(0, 64);
        }

        setForm((prev) => ({ ...prev, [field]: value }));
        setGeneralError("");

        // Clear error as user corrects the field
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }

        // Revalidate if field has already been touched
        if (touched[field]) {
            validateField(field, value);
        }
    }

    // Physical keydown interceptor to guarantee input field strictly rejects typing beyond max limit
    function handleKeyDownLimit(e, maxLength) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const isControlKey = [
            "Backspace", "Delete", "Tab", "Enter", "Escape",
            "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
            "Home", "End", "PageUp", "PageDown"
        ].includes(e.key);
        if (isControlKey) return;

        const input = e.target;
        const hasSelection = input.selectionStart !== input.selectionEnd;
        if (input.value && input.value.length >= maxLength && !hasSelection) {
            e.preventDefault();
        }
    }

    // Physical paste interceptor to prevent entering more than max length
    function handlePasteLimit(e, field, maxLength) {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
        const input = e.target;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        const current = input.value || "";
        const combined = current.slice(0, start) + pasted + current.slice(end);
        handleChange(field, combined.slice(0, maxLength));
    }

    function handleBlur(field) {
        setTouched((prev) => ({ ...prev, [field]: true }));
        validateField(field, form[field]);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setGeneralError("");

        // Mark all fields touched
        setTouched({ email: true, password: true });

        const emailErr = validateField("email", form.email);
        const passErr = validateField("password", form.password);

        if (emailErr || passErr) {
            return;
        }

        setLoading(true);

        try {
            await login({
                email: form.email.trim().toLowerCase(),
                password: form.password
            });
            showToast("Welcome back! Signed in successfully.", "success");
            navigate("/");
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                "Invalid email or password. Please verify your credentials.";
            setGeneralError(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    }

    const isEmailValid = touched.email && !errors.email && form.email.trim() !== "";
    const isEmailInvalid = touched.email && Boolean(errors.email);

    const isPasswordValid = touched.password && !errors.password && form.password !== "";
    const isPasswordInvalid = touched.password && Boolean(errors.password);

    return (
        <div className="auth-pure-canvas">
            <div className="auth-pure-card">
                {/* Brand Logo & Header */}
                <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center mb-3">
                        <div className="auth-brand-icon">
                            <i className="bi bi-wallet2"></i>
                        </div>
                    </div>
                    <h2 className="auth-pure-title">Sign In</h2>
                    <p className="auth-pure-subtitle">Welcome back! Please enter your details.</p>
                </div>

                {/* Error Banner */}
                {generalError && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                        <span>{generalError}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} noValidate>
                    {/* Email Input */}
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted mb-1">Email</label>
                        <div
                            className={`input-group input-group-auth ${
                                isEmailInvalid ? "is-invalid" : isEmailValid ? "is-valid" : ""
                            }`}
                        >
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-envelope"></i>
                            </span>
                            <input
                                type="email"
                                className="form-control auth-input-field"
                                placeholder="Enter your email"
                                required
                                maxLength={254}
                                value={form.email}
                                onKeyDown={(e) => handleKeyDownLimit(e, 254)}
                                onPaste={(e) => handlePasteLimit(e, "email", 254)}
                                onChange={(e) => handleChange("email", e.target.value)}
                                onBlur={() => handleBlur("email")}
                                disabled={loading}
                            />
                            {isEmailValid && (
                                <span className="auth-valid-icon" title="Valid email format">
                                    <i className="bi bi-check-circle-fill"></i>
                                </span>
                            )}
                        </div>
                        {isEmailInvalid && (
                            <div className="auth-field-error">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                <span>{errors.email}</span>
                            </div>
                        )}
                    </div>

                    {/* Password Input with Visibility Toggle */}
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label small fw-bold text-muted mb-0">Password</label>
                            <span
                                className="small text-primary fw-semibold"
                                style={{ cursor: "pointer", fontSize: "0.82rem" }}
                                onClick={() =>
                                    showToast("To reset your password, contact your administrator.", "info")
                                }
                            >
                                Forgot password?
                            </span>
                        </div>
                        <div
                            className={`input-group input-group-auth ${
                                isPasswordInvalid ? "is-invalid" : isPasswordValid ? "is-valid" : ""
                            }`}
                        >
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-lock"></i>
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control auth-input-field"
                                placeholder="Enter your password"
                                required
                                maxLength={64}
                                value={form.password}
                                onKeyDown={(e) => handleKeyDownLimit(e, 64)}
                                onPaste={(e) => handlePasteLimit(e, "password", 64)}
                                onChange={(e) => handleChange("password", e.target.value)}
                                onBlur={() => handleBlur("password")}
                                disabled={loading}
                            />
                            {isPasswordValid && (
                                <span className="auth-valid-icon" title="Password entered">
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
                        {isPasswordInvalid && (
                            <div className="auth-field-error">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                <span>{errors.password}</span>
                            </div>
                        )}
                    </div>

                    {/* Remember Me */}
                    <div className="d-flex align-items-center justify-content-between mb-4 mt-2">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="rememberMeCheck"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label className="form-check-label small text-muted" htmlFor="rememberMeCheck">
                                Remember for 30 days
                            </label>
                        </div>
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
                                <span>Signing In...</span>
                            </>
                        ) : (
                            <span>Sign In</span>
                        )}
                    </button>
                </form>

                {/* Switch to Register */}
                <p className="text-center text-muted mt-4 mb-0 small">
                    Don't have an account?{" "}
                    <Link to="/register" className="fw-bold text-decoration-none text-primary">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
