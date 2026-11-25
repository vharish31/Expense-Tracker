import { formatINR } from "../utils/currency";

function SummaryCard({
    title,
    amount,
    subtitle,
    icon = "bi-wallet2",
    variant = "primary",
    trend,
    trendType = "neutral",
    isCurrency = true
}) {
    const displayAmount = isCurrency ? (typeof amount === "number" ? formatINR(amount) : amount) : amount;

    return (
        <div className={`kpi-stat-card ${variant}`}>
            <div>
                <div className="kpi-top-row">
                    <span className="kpi-title-label">{title}</span>
                    <div className="kpi-icon-badge" style={{ backgroundColor: "var(--bg-surface-subtle)", color: `var(--color-${variant === "primary" ? "primary" : variant})` }}>
                        <i className={`bi ${icon}`}></i>
                    </div>
                </div>
                <div className="kpi-amount-rupee">{displayAmount}</div>
            </div>

            <div className="kpi-meta-row">
                {trend && (
                    <span
                        className={`badge rounded-pill fw-bold ${
                            trendType === "positive"
                                ? "bg-success-subtle text-success"
                                : trendType === "negative"
                                ? "bg-danger-subtle text-danger"
                                : "bg-primary-subtle text-primary"
                        }`}
                        style={{ fontSize: "0.74rem" }}
                    >
                        {trend}
                    </span>
                )}
                {subtitle && <span className="text-truncate">{subtitle}</span>}
            </div>
        </div>
    );
}

export default SummaryCard;
