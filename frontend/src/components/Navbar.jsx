import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import API from "../services/api";
import { formatINR } from "../utils/currency";

function formatNotificationTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function Navbar({ onToggleSidebar, isSidebarOpen }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    // Notification States
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const dropdownRef = useRef(null);

    // User Profile Dropdown State
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const userDropdownRef = useRef(null);

    const todayFormatted = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const userInitial = user?.name ? user.name[0].toUpperCase() : "U";

    // Fetch Notifications
    async function fetchNotifications() {
        try {
            const res = await API.get("/notifications");
            setNotifications(res.data?.notifications || []);
            setUnreadCount(res.data?.unreadCount || 0);
        } catch (err) {
            // Silently ignore if not logged in or backend booting
        }
    }

    useEffect(() => {
        fetchNotifications();

        // Listen for new transactions created anywhere in the app
        const handleTxUpdate = () => fetchNotifications();
        window.addEventListener("fintrack:transaction_created", handleTxUpdate);
        window.addEventListener("focus", handleTxUpdate);

        // Periodic background poll every 20 seconds
        const interval = setInterval(fetchNotifications, 20000);

        return () => {
            window.removeEventListener("fintrack:transaction_created", handleTxUpdate);
            window.removeEventListener("focus", handleTxUpdate);
            clearInterval(interval);
        };
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Mark single notification as read
    async function handleMarkAsRead(notif) {
        if (!notif.is_read) {
            try {
                await API.patch(`/notifications/${notif.id}/read`);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch (err) {
                console.error("Error marking notification read:", err);
            }
        }

        setShowDropdown(false);
        navigate("/transactions");
    }

    // Mark all notifications as read
    async function handleMarkAllRead() {
        try {
            await API.post("/notifications/mark-all-read");
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all read:", err);
        }
    }

    // Clear notifications
    async function handleClearAll() {
        try {
            await API.delete("/notifications/clear");
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error("Error clearing notifications:", err);
        }
    }

    function handleSearch(e) {
        if (e.key === "Enter" && searchTerm.trim()) {
            navigate(`/transactions?q=${encodeURIComponent(searchTerm.trim())}`);
        }
    }

    return (
        <header className="official-topbar">
            {/* Left: Search Box */}
            <div className="d-flex align-items-center gap-2 gap-md-3">
                {!isSidebarOpen && (
                    <button
                        className="topbar-toggle-btn"
                        onClick={onToggleSidebar}
                        aria-label="Open Sidebar"
                        title="Open Sidebar"
                    >
                        <i className="bi bi-layout-sidebar"></i>
                    </button>
                )}

                {/* Responsive Search Input */}
                <div className="topbar-search-box">
                    <i className="bi bi-search topbar-search-icon"></i>
                    <input
                        type="text"
                        className="topbar-search-input"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
            </div>

            {/* Right: Date Pill, Notification Bell, User Avatar */}
            <div className="topbar-actions">
                {/* Date Pill */}
                <div className="topbar-date-pill d-none d-md-flex">
                    <span>Today {todayFormatted}</span>
                    <i className="bi bi-calendar3"></i>
                </div>

                {/* Bell Icon with Interactive Notification Dropdown */}
                <div className="position-relative" ref={dropdownRef}>
                    <button
                        className="topbar-icon-btn"
                        title="Notifications"
                        onClick={() => {
                            setShowDropdown(!showDropdown);
                            if (!showDropdown) fetchNotifications();
                        }}
                        aria-expanded={showDropdown}
                    >
                        <i className="bi bi-bell"></i>
                        {unreadCount > 0 ? (
                            <span className="topbar-notification-badge">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        ) : null}
                    </button>

                    {/* Notification Dropdown Menu */}
                    {showDropdown && (
                        <div className="notification-dropdown-menu">
                            {/* Header */}
                            <div className="notification-header">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold text-dark" style={{ fontSize: "0.95rem" }}>
                                        Notifications
                                    </span>
                                    {unreadCount > 0 && (
                                        <span className="badge bg-primary text-white rounded-pill px-2 py-1" style={{ fontSize: "0.68rem" }}>
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm text-decoration-none p-0 text-primary"
                                            style={{ fontSize: "0.78rem", fontWeight: 600 }}
                                            onClick={handleMarkAllRead}
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm text-decoration-none p-0 text-muted"
                                            style={{ fontSize: "0.78rem" }}
                                            onClick={handleClearAll}
                                            title="Clear notifications"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* List of Notification Items */}
                            <div className="notification-list-body">
                                {notifications.length > 0 ? (
                                    notifications.map((n) => {
                                        const isCredit = n.type === "credit";
                                        return (
                                            <div
                                                key={n.id}
                                                className={`notification-item ${!n.is_read ? "unread" : ""}`}
                                                onClick={() => handleMarkAsRead(n)}
                                            >
                                                {/* Left Icon Badge */}
                                                <div className={`notif-icon-circle ${isCredit ? "notif-credit" : "notif-debit"}`}>
                                                    <i className={`bi ${isCredit ? "bi-arrow-down-left" : "bi-arrow-up-right"}`}></i>
                                                </div>

                                                {/* Mid Details */}
                                                <div className="notif-info">
                                                    <div className="d-flex justify-content-between align-items-start gap-1">
                                                        <span className="fw-bold text-dark" style={{ fontSize: "0.85rem" }}>
                                                            {n.title}
                                                        </span>
                                                        <small className="text-muted" style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                                                            {formatNotificationTime(n.created_at)}
                                                        </small>
                                                    </div>

                                                    <p className="mb-1 text-muted" style={{ fontSize: "0.8rem", lineHeight: "1.3" }}>
                                                        {n.message}
                                                    </p>

                                                    <div className="d-flex justify-content-between align-items-center mt-1">
                                                        {n.ref_no ? (
                                                            <code className="text-secondary" style={{ fontSize: "0.7rem" }}>
                                                                UTR: {n.ref_no}
                                                            </code>
                                                        ) : (
                                                            <span></span>
                                                        )}
                                                        <span className={`fw-bold ${isCredit ? "text-success" : "text-danger"}`} style={{ fontSize: "0.82rem" }}>
                                                            {isCredit ? `+ ${formatINR(n.amount)}` : `- ${formatINR(n.amount)}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Unread Indicator Dot */}
                                                {!n.is_read && <span className="notif-unread-dot"></span>}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-5 px-3">
                                        <div
                                            className="rounded-circle bg-light text-muted d-inline-flex align-items-center justify-content-center mb-2"
                                            style={{ width: "48px", height: "48px", fontSize: "1.4rem" }}
                                        >
                                            <i className="bi bi-bell-slash"></i>
                                        </div>
                                        <div className="fw-semibold text-dark small">No notifications yet</div>
                                        <small className="text-muted d-block" style={{ fontSize: "0.76rem" }}>
                                            Instant alerts for credits, debits, and transfers will appear here.
                                        </small>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="notification-footer">
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm text-decoration-none p-0 text-primary fw-semibold w-100 text-center"
                                        style={{ fontSize: "0.82rem" }}
                                        onClick={() => {
                                            setShowDropdown(false);
                                            navigate("/transactions");
                                        }}
                                    >
                                        View Passbook Statement <i className="bi bi-arrow-right ms-1"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User Avatar with Profile & Logout Dropdown */}
                <div className="position-relative" ref={userDropdownRef}>
                    <button
                        type="button"
                        className="topbar-avatar-btn"
                        onClick={() => setShowUserDropdown((prev) => !prev)}
                        title={`${user?.name || "User"} Account`}
                        aria-expanded={showUserDropdown}
                    >
                        {userInitial}
                    </button>

                    {showUserDropdown && (
                        <div className="topbar-user-dropdown-menu">
                            {/* User Profile Info Header */}
                            <div className="topbar-user-dropdown-header">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="topbar-avatar-btn small-avatar">
                                        {userInitial}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="fw-bold text-dark text-truncate" style={{ fontSize: "0.88rem" }}>
                                            {user?.name || "User"}
                                        </div>
                                        <div className="text-muted text-truncate" style={{ fontSize: "0.74rem" }}>
                                            {user?.email || "No email"}
                                        </div>
                                        {user?.phone && (
                                            <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                <i className="bi bi-phone me-1"></i>{user.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <hr className="my-1 border-light-subtle" />

                            {/* Logout Action */}
                            <button
                                type="button"
                                className="topbar-user-dropdown-item text-danger"
                                onClick={() => {
                                    setShowUserDropdown(false);
                                    logout();
                                }}
                            >
                                <i className="bi bi-box-arrow-right me-2"></i>
                                <span>Log Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;
