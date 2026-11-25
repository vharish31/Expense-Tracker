import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/auth";

const navItems = [
    { name: "Dashboard", path: "/", icon: "bi-grid-fill", dot: true },
    { name: "Transactions", path: "/transactions", icon: "bi-receipt-cutoff" },
    { name: "Budget Ceilings", path: "/budget", icon: "bi-piggy-bank-fill" },
    { name: "Financial Analytics", path: "/analytics", icon: "bi-graph-up-arrow" }
];

function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const userInitial = user?.name ? user.name[0].toUpperCase() : "A";

    const handleNavClick = () => {
        // Auto-close on small screens when clicking a nav item
        if (window.innerWidth < 992) {
            onClose();
        }
    };

    return (
        <>
            <aside className={`official-sidebar ${isOpen ? "open" : "closed"}`}>
                <div className="d-flex flex-column h-100 justify-content-between">
                    <div>
                        {/* Header: Brand Logo & Dedicated Close Button */}
                        <div className="sidebar-header">
                            <Link to="/" className="sidebar-brand-row" onClick={handleNavClick}>
                                <div className="sidebar-brand-mark">
                                    <i className="bi bi-wallet2"></i>
                                </div>
                                <div>
                                    <div className="sidebar-brand-title">FinTrack</div>
                                    <div className="sidebar-brand-subtitle">
                                        <span className="pulse-status-dot" style={{ width: "6px", height: "6px", backgroundColor: "#10B981", borderRadius: "50%", display: "inline-block" }}></span>
                                        <span>Official Ledger</span>
                                    </div>
                                </div>
                            </Link>

                            {/* Sidebar Menu Toggle Button */}
                            <button
                                className="sidebar-close-btn"
                                onClick={onClose}
                                title="Collapse sidebar"
                                aria-label="Collapse sidebar"
                            >
                                <i className="bi bi-layout-sidebar-inset"></i>
                            </button>
                        </div>

                        {/* Navigation Items */}
                        <div className="sidebar-nav-container">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === "/"}
                                    className={({ isActive }) =>
                                        `sidebar-nav-item ${isActive ? "active" : ""}`
                                    }
                                    onClick={handleNavClick}
                                >
                                    <div className="sidebar-nav-item-left">
                                        <i className={`bi ${item.icon}`}></i>
                                        <span>{item.name}</span>
                                    </div>
                                    {item.dot && (
                                        <span className="sidebar-nav-indicator-dot"></span>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>

                    {/* Footer: User Profile & Logout */}
                    <div className="sidebar-footer-profile">
                        <div className="sidebar-profile-card">
                            <div className="d-flex align-items-center gap-2 overflow-hidden">
                                <div className="sidebar-user-avatar">
                                    {userInitial}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="fw-bold small text-truncate" style={{ maxWidth: "110px", color: "var(--text-main)" }}>
                                        {user?.name || "Finance Admin"}
                                    </div>
                                    <div className="text-muted text-truncate" style={{ fontSize: "0.72rem" }}>
                                        {user?.email || "user@fintrack.in"}
                                    </div>
                                </div>
                            </div>

                            <button
                                className="sidebar-logout-btn"
                                onClick={logout}
                                title="Sign out"
                            >
                                <i className="bi bi-box-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile / Tablet Backdrop Overlay */}
            {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
        </>
    );
}

export default Sidebar;
