import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";

function Navbar({ onToggleSidebar, isSidebarOpen }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    const todayFormatted = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const userInitial = user?.name ? user.name[0].toUpperCase() : "U";

    function handleSearch(e) {
        if (e.key === "Enter" && searchTerm.trim()) {
            navigate(`/transactions?q=${encodeURIComponent(searchTerm.trim())}`);
        }
    }

    return (
        <header className="official-topbar">
            {/* Left: Universal Sidebar Toggle Button & Search Box */}
            <div className="d-flex align-items-center gap-2 gap-md-3">
                {/* Always-visible Sidebar Toggle Button (Desktop & Mobile) */}
                <button
                    className="topbar-toggle-btn"
                    onClick={onToggleSidebar}
                    aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                    title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                >
                    <i className={`bi ${isSidebarOpen ? "bi-layout-sidebar-inset" : "bi-layout-sidebar"}`}></i>
                </button>

                {/* Responsive Search Input */}
                <div className="topbar-search-box">
                    <i className="bi bi-search topbar-search-icon"></i>
                    <input
                        type="text"
                        className="topbar-search-input"
                        placeholder="Search name or amount..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
            </div>

            {/* Right: Date Pill, Notification Bell, User Avatar */}
            <div className="topbar-actions">
                {/* Date Pill: Hidden on mobile, visible on tablet & desktop */}
                <div className="topbar-date-pill d-none d-md-flex">
                    <span>Today {todayFormatted}</span>
                    <i className="bi bi-calendar3"></i>
                </div>

                {/* Bell Icon with Red Notification Dot */}
                <button
                    className="topbar-icon-btn"
                    title="Notifications"
                    onClick={() => alert("PostgreSQL Database Synchronized. All records are up to date.")}
                >
                    <i className="bi bi-bell"></i>
                    <span className="topbar-notification-dot"></span>
                </button>

                {/* User Avatar */}
                <div
                    className="topbar-avatar-btn"
                    onClick={logout}
                    title={`${user?.name || "User"} (Click to sign out)`}
                >
                    {userInitial}
                </div>
            </div>
        </header>
    );
}

export default Navbar;
