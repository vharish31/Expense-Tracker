import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

function Login() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(form);
            navigate("/");
        } catch (err) {
            setError(err.response?.data?.message || "Invalid email or password. Please verify your credentials.");
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
                    <h2 className="auth-pure-title">Sign In</h2>
                    <p className="auth-pure-subtitle">Welcome back! Please enter your details.</p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                        <span>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
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

                    {/* Password Input with Visibility Toggle */}
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label small fw-bold text-muted mb-0">Password</label>
                            <span 
                                className="small text-primary fw-semibold"
                                style={{ cursor: "pointer", fontSize: "0.82rem" }}
                                onClick={() => alert("To reset password, contact your administrator or register a new account.")}
                            >
                                Forgot password?
                            </span>
                        </div>
                        <div className="input-group input-group-auth">
                            <span className="input-group-text auth-input-icon">
                                <i className="bi bi-lock"></i>
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control auth-input-field"
                                placeholder="••••••••"
                                required
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
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
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
