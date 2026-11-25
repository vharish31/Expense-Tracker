import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

function Register() {
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", pin: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await register(form);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.message || "Could not complete registration. Please verify details.");
        } finally {
            setLoading(false);
        }
    }

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
                    <h2 className="auth-pure-title">Create an Account</h2>
                    <p className="auth-pure-subtitle">Start tracking your expenses and passbook ledger.</p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                        <span>{error}</span>
                    </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit}>
                    {/* Full Name */}
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted mb-1">Full Name</label>
                        <div className="input-group input-group-auth">
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-person"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control auth-input-field"
                                placeholder="e.g. Rahul Sharma"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Email Input */}
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted mb-1">Email</label>
                        <div className="input-group input-group-auth">
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-envelope"></i>
                            </span>
                            <input
                                type="email"
                                className="form-control auth-input-field"
                                placeholder="name@company.com"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Mobile Number Input */}
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted mb-1">Mobile Number (For P2P Payments)</label>
                        <div className="input-group input-group-auth">
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
                                pattern="[0-9]{10}"
                                value={form.phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    setForm({ ...form, phone: val });
                                }}
                            />
                        </div>
                    </div>

                    {/* Password Input with Visibility Toggle */}
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted mb-1">Password</label>
                        <div className="input-group input-group-auth">
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-lock"></i>
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control auth-input-field"
                                placeholder="Minimum 6 characters"
                                required
                                minLength={6}
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                            />
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
                    </div>

                    {/* 4-Digit Security PIN (For Instant Payments) */}
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label small fw-bold text-muted mb-0">
                                4-Digit Payment Security PIN
                            </label>
                            <span className="badge bg-light text-primary border small">Required for transfers</span>
                        </div>
                        <div className="input-group input-group-auth">
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-shield-lock"></i>
                            </span>
                            <input
                                type={showPin ? "text" : "password"}
                                className="form-control auth-input-field"
                                placeholder="4-digit PIN (e.g. 1234)"
                                required
                                maxLength={4}
                                pattern="[0-9]{4}"
                                inputMode="numeric"
                                value={form.pin}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                    setForm({ ...form, pin: val });
                                }}
                            />
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
                        <small className="text-muted" style={{ fontSize: "0.78rem" }}>
                            You will enter this 4-digit PIN every time you make a payment.
                        </small>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-auth-pill"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
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
