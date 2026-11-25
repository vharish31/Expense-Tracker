function Footer() {
    return (
        <footer className="footer-luxury text-center">
            <div className="container-fluid px-4 d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-wallet2" style={{ color: "var(--accent-primary)" }}></i>
                    <span className="fw-bold" style={{ color: "var(--app-text-primary)" }}>FinTrack</span>
                    <span>&copy; {new Date().getFullYear()} Expense Tracker. All rights reserved.</span>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <span className="badge rounded-pill" style={{ background: "var(--accent-primary-glow)", color: "var(--accent-primary)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                        PostgreSQL Powered
                    </span>
                    <span className="text-muted" style={{ fontSize: "0.8rem" }}>v2.4 Premium</span>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
