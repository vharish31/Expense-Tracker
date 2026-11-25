import { useEffect, useMemo, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import API from "../services/api";
import { formatINR } from "../utils/currency";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

function getMonthKey(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function getMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleString("en-IN", {
        month: "short",
        year: "numeric"
    });
}

function Analytics() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState("all");

    useEffect(() => {
        API.get("/transactions")
            .then((res) => setTransactions(res.data || []))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filteredTransactions = useMemo(() => {
        if (dateFilter === "all") return transactions;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return transactions.filter((t) => {
            const date = new Date(t.transaction_date);
            if (dateFilter === "thisMonth") {
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            }
            if (dateFilter === "last3Months") {
                const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
                return date >= threeMonthsAgo;
            }
            if (dateFilter === "thisYear") {
                return date.getFullYear() === currentYear;
            }
            return true;
        });
    }, [transactions, dateFilter]);

    // Monthly Aggregation
    const monthlyData = useMemo(() => {
        const map = {};
        filteredTransactions.forEach((tx) => {
            const mKey = getMonthKey(tx.transaction_date);
            if (!map[mKey]) {
                map[mKey] = { income: 0, expenses: 0 };
            }
            if (tx.type === "Income") {
                map[mKey].income += Number(tx.amount);
            } else {
                map[mKey].expenses += Number(tx.amount);
            }
        });
        return map;
    }, [filteredTransactions]);

    const monthKeys = useMemo(() => Object.keys(monthlyData).sort(), [monthlyData]);

    const lineData = useMemo(() => {
        const labels = monthKeys.length > 0 ? monthKeys.map(getMonthLabel) : ["Period 1", "Period 2", "Period 3"];
        const incomeValues = monthKeys.length > 0 ? monthKeys.map((k) => monthlyData[k].income) : [0, 0, 0];
        const expenseValues = monthKeys.length > 0 ? monthKeys.map((k) => monthlyData[k].expenses) : [0, 0, 0];

        return {
            labels,
            datasets: [
                {
                    label: "Inflow (Credits)",
                    data: incomeValues,
                    borderColor: "#059669",
                    backgroundColor: "rgba(5, 150, 105, 0.1)",
                    tension: 0.35,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "#059669"
                },
                {
                    label: "Outflow (Debits)",
                    data: expenseValues,
                    borderColor: "#DC2626",
                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                    tension: 0.35,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "#DC2626"
                }
            ]
        };
    }, [monthKeys, monthlyData]);

    // Category Breakdown
    const expenseByCategory = useMemo(() => {
        const map = {};
        filteredTransactions
            .filter((t) => t.type === "Expense")
            .forEach((t) => {
                const cat = t.category || "General";
                map[cat] = (map[cat] || 0) + Number(t.amount);
            });
        return map;
    }, [filteredTransactions]);

    const doughnutData = useMemo(() => {
        const keys = Object.keys(expenseByCategory);
        const values = Object.values(expenseByCategory);

        const palette = [
            "#2563EB",
            "#059669",
            "#DC2626",
            "#D97706",
            "#7C3AED",
            "#0891B2",
            "#4B5563"
        ];

        return {
            labels: keys,
            datasets: [
                {
                    data: values,
                    backgroundColor: palette.slice(0, keys.length),
                    borderWidth: 2,
                    borderColor: "#FFFFFF"
                }
            ]
        };
    }, [expenseByCategory]);

    const { totalIncome, totalExpenses, totalSavings } = useMemo(() => {
        let inc = 0;
        let exp = 0;
        filteredTransactions.forEach((t) => {
            const amt = Number(t.amount) || 0;
            if (t.type === "Income") inc += amt;
            else exp += amt;
        });
        return { totalIncome: inc, totalExpenses: exp, totalSavings: inc - exp };
    }, [filteredTransactions]);

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3"></div>
                <h5 className="fw-bold">Synthesizing Analytics Telemetry...</h5>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <h2 className="fw-bold mb-1" style={{ fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
                        Quantitative Analytics & Insights
                    </h2>
                    <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                        Multi-period cash trajectory, debit allocations, and liquidity velocity (INR)
                    </p>
                </div>

                <select
                    className="form-select-official w-auto"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                >
                    <option value="all">All Available History</option>
                    <option value="thisMonth">Active Month</option>
                    <option value="last3Months">Trailing 90 Days</option>
                    <option value="thisYear">Fiscal Year</option>
                </select>
            </div>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="official-card p-4">
                        <span className="text-muted small fw-semibold">Net Retained Capital</span>
                        <h3 className={`fw-bold mt-1 mb-0 ${totalSavings >= 0 ? "text-primary" : "text-danger"}`}>
                            {formatINR(totalSavings)}
                        </h3>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="official-card p-4">
                        <span className="text-muted small fw-semibold">Cumulative Inflow</span>
                        <h3 className="fw-bold mt-1 mb-0 text-success">{formatINR(totalIncome)}</h3>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="official-card p-4">
                        <span className="text-muted small fw-semibold">Cumulative Outflow</span>
                        <h3 className="fw-bold mt-1 mb-0 text-danger">{formatINR(totalExpenses)}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="row g-4">
                {/* Cash Flow Line Chart */}
                <div className="col-12 col-lg-8">
                    <div className="official-card h-100 d-flex flex-column justify-content-between">
                        <div className="card-header-official">
                            <h3 className="card-title-official">
                                <i className="bi bi-graph-up-arrow text-primary"></i>
                                Trend Trajectory
                            </h3>
                            <span className="badge bg-secondary-subtle text-secondary small">Historical Inflow vs Outflow</span>
                        </div>
                        <div className="p-4" style={{ height: 320, position: "relative" }}>
                            {monthKeys.length > 0 ? (
                                <Line
                                    data={lineData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: "top",
                                                align: "end",
                                                labels: {
                                                    usePointStyle: true,
                                                    boxWidth: 8,
                                                    color: "#475569",
                                                    font: { size: 12, weight: 600 }
                                                }
                                            },
                                            tooltip: {
                                                backgroundColor: "#0F172A",
                                                padding: 12,
                                                cornerRadius: 8,
                                                callbacks: {
                                                    label: (context) => ` ${context.dataset.label}: ${formatINR(context.raw)}`
                                                }
                                            }
                                        },
                                        scales: {
                                            x: { grid: { display: false } },
                                            y: {
                                                grid: { color: "#E2E8F0" },
                                                ticks: { callback: (val) => formatINR(val, { decimals: 0 }) }
                                            }
                                        }
                                    }}
                                />
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-graph-up fs-2 d-block mb-2"></i>
                                    <p>Insufficient multi-period data to plot trajectory.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Doughnut Category Burn */}
                <div className="col-12 col-lg-4">
                    <div className="official-card h-100 d-flex flex-column justify-content-between">
                        <div className="card-header-official">
                            <h3 className="card-title-official">
                                <i className="bi bi-pie-chart text-primary"></i>
                                Category Distribution
                            </h3>
                            <span className="badge bg-secondary-subtle text-secondary small">Expenditure</span>
                        </div>
                        <div className="p-4" style={{ height: 320, position: "relative" }}>
                            {Object.keys(expenseByCategory).length > 0 ? (
                                <Doughnut
                                    data={doughnutData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        cutout: "70%",
                                        plugins: {
                                            legend: {
                                                position: "bottom",
                                                labels: {
                                                    usePointStyle: true,
                                                    boxWidth: 8,
                                                    color: "#475569",
                                                    font: { size: 11, weight: 600 }
                                                }
                                            },
                                            tooltip: {
                                                backgroundColor: "#0F172A",
                                                padding: 12,
                                                cornerRadius: 8,
                                                callbacks: {
                                                    label: (context) => ` ${context.label}: ${formatINR(context.raw)}`
                                                }
                                            }
                                        }
                                    }}
                                />
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-pie-chart fs-2 d-block mb-2"></i>
                                    <p>No category expenditure data to display.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Analytics;
