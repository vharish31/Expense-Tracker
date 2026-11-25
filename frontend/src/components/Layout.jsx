import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function Layout() {
    // Default open on wide desktop (>= 992px), closed on tablet/mobile (< 992px)
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== "undefined") {
            return window.innerWidth >= 992;
        }
        return true;
    });

    const location = useLocation();

    // Auto-close overlay sidebar on mobile/tablet when route changes
    useEffect(() => {
        if (window.innerWidth < 992) {
            setSidebarOpen(false);
        }
    }, [location.pathname]);

    // Handle Escape key to close sidebar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && sidebarOpen) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sidebarOpen]);

    const toggleSidebar = () => setSidebarOpen((prev) => !prev);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className={`official-app-layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
            {/* Closable Sidebar & Mobile Overlay Backdrop */}
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main Content Area */}
            <div className={`official-main-content ${sidebarOpen ? "with-sidebar" : "full-width"}`}>
                <Navbar onToggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />
                <main className="app-content-viewport">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;
