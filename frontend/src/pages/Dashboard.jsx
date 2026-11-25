import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import API from "../services/api";
import { useAuth } from "../context/auth";
import { formatINR } from "../utils/currency";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

const THEME_CLASSES = {
    blue: "bank-card-blue",
    green: "bank-card-green",
    purple: "bank-card-purple",
    coral: "bank-card-coral"
};

function Dashboard() {
    const { user } = useAuth();

    const [transactions, setTransactions] = useState([]);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activityPeriod, setActivityPeriod] = useState("This Week");
    const [activeCardIndex, setActiveCardIndex] = useState(0);

    // Modals
    const [showQuickModal, setShowQuickModal] = useState(false);
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);

    // Quick Transaction Form
    const [quickForm, setQuickForm] = useState({
        title: "",
        amount: "",
        type: "Expense",
        category: "General",
        description: "",
        transaction_date: new Date().toISOString().slice(0, 10)
    });

    // Add Vault / Card Form
    const [cardForm, setCardForm] = useState({
        card_name: "",
        card_network: "VISA",
        card_number: "",
        balance: "",
        card_holder: user?.name || "HARI",
        expiry_date: "05/2028",
        theme: "blue"
    });

    async function loadData() {
        try {
            const [txRes, cardRes] = await Promise.all([
                API.get("/transactions"),
                API.get("/cards").catch(() => ({ data: [] }))
            ]);
            setTransactions(txRes.data || []);
            // User's cards strictly from database (0 initially after registration, added manually)
            setCards(cardRes.data || []);
        } catch (err) {
            console.error("Error loading dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // Financial Metrics
    const { totalIncome, totalExpenses, totalBalance, todayIncome, todayExpenses } = useMemo(() => {
        let income = 0;
        let expense = 0;
        let tIncome = 0;
        let tExpense = 0;

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        transactions.forEach((t) => {
            const val = Number(t.amount) || 0;
            const dateStr = t.transaction_date ? String(t.transaction_date).slice(0, 10) : "";
            const isToday = dateStr === todayStr;

            if (t.type === "Income") {
                income += val;
                if (isToday) tIncome += val;
            } else {
                expense += val;
                if (isToday) tExpense += val;
            }
        });

        if (tIncome === 0 && income > 0) tIncome = Math.round(income / 30);
        if (tExpense === 0 && expense > 0) tExpense = Math.round(expense / 30);

        return {
            totalIncome: income,
            totalExpenses: expense,
            totalBalance: income - expense,
            todayIncome: tIncome,
            todayExpenses: tExpense
        };
    }, [transactions]);

    // Carousel Navigation
    function handleNextCard() {
        if (cards.length <= 1) return;
        setActiveCardIndex((prev) => (prev + 1) % cards.length);
    }

    // Visible cards in carousel
    const visibleCards = useMemo(() => {
        if (cards.length === 0) return [];
        const result = [];
        const count = Math.min(2, cards.length);
        for (let i = 0; i < count; i++) {
            const index = (activeCardIndex + i) % cards.length;
            result.push(cards[index]);
        }
        return result;
    }, [cards, activeCardIndex]);

    // Handle Manual Add Card / Vault
    async function handleAddCardSubmit(e) {
        e.preventDefault();
        if (cards.length >= 4) {
            alert("You can maintain a maximum of 4 vault cards. Please remove an existing vault to add a new one.");
            return;
        }
        try {
            const res = await API.post("/cards", {
                ...cardForm,
                card_holder: cardForm.card_holder || user?.name || "HARI"
            });
            setCards((prev) => [...prev, res.data.card]);
            setShowAddCardModal(false);
            setCardForm({
                card_name: "",
                card_network: "VISA",
                card_number: "",
                balance: "",
                card_holder: user?.name || "HARI",
                expiry_date: "05/2028",
                theme: "blue"
            });
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add vault");
        }
    }

    // Handle Manual Remove / Delete Card Vault
    async function handleDeleteCard(cardId, cardName) {
        if (!window.confirm(`Permanently remove "${cardName}" from your vaults?`)) {
            return;
        }

        try {
            await API.delete(`/cards/${cardId}`);
            setCards((prev) => prev.filter((c) => c.id !== cardId));
            setActiveCardIndex(0);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to remove vault");
        }
    }

    // Activities Chart Data (Smooth coral spline wave)
    const activitiesData = useMemo(() => {
        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const dayTotals = [0, 0, 0, 0, 0, 0, 0];

        transactions.forEach((t) => {
            if (t.type === "Expense") {
                const d = new Date(t.transaction_date).getDay();
                const index = d === 0 ? 6 : d - 1; // Mon=0, Sun=6
                dayTotals[index] += Number(t.amount);
            }
        });

        const points = dayTotals.some((val) => val > 0)
            ? dayTotals
            : [20000, 32000, 24000, 28000, 36000, 22000, 39000];

        return {
            labels,
            datasets: [
                {
                    label: "Total Spending",
                    data: points,
                    borderColor: "#FF6B6B",
                    borderWidth: 3,
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 240);
                        gradient.addColorStop(0, "rgba(255, 107, 107, 0.25)");
                        gradient.addColorStop(1, "rgba(255, 107, 107, 0.0)");
                        return gradient;
                    },
                    fill: true,
                    tension: 0.45,
                    pointRadius: [0, 0, 0, 5, 0, 0, 0],
                    pointBackgroundColor: "#FF6B6B",
                    pointBorderColor: "#FFFFFF",
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }
            ]
        };
    }, [transactions]);

    const activitiesOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#1E293B",
                titleColor: "#FFFFFF",
                bodyColor: "#E2E8F0",
                padding: 10,
                cornerRadius: 10,
                callbacks: {
                    label: (context) => ` Spending: ${formatINR(context.raw)}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: "#94A3B8",
                    font: { size: 11, weight: 600 }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "#F1F5F9",
                    drawBorder: false
                },
                ticks: {
                    color: "#94A3B8",
                    font: { size: 10, weight: 600 },
                    callback: (value) => {
                        if (value >= 1000) return `${Math.round(value / 1000)}K`;
                        return value;
                    },
                    maxTicksLimit: 5
                }
            }
        }
    }), []);

    // Recent Transactions list matching screenshot
    const recentTxList = useMemo(() => {
        if (transactions.length > 0) {
            return transactions.slice(0, 4).map((t, idx) => {
                const isExpense = t.type === "Expense";
                const avatars = [
                    "tx-avatar-orange bi-person-fill",
                    "tx-avatar-purple bi-briefcase-fill",
                    "tx-avatar-red bi-exclamation-circle-fill",
                    "tx-avatar-teal bi-spotify"
                ];

                return {
                    id: t.id,
                    name: t.title,
                    date: new Date(t.transaction_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }),
                    amount: Number(t.amount),
                    isExpense,
                    statusLabel: isExpense ? `Sent ${formatINR(t.amount)}` : `Received ${formatINR(t.amount)}`,
                    statusType: isExpense ? "sent" : "received",
                    avatarClass: avatars[idx % avatars.length]
                };
            });
        }

        return [
            {
                id: 1,
                name: "Jhon A Branda",
                date: "15 Jan 2026",
                amount: 120,
                statusLabel: "Sent ₹120.00",
                statusType: "sent",
                avatarClass: "tx-avatar-orange bi-person-fill"
            },
            {
                id: 2,
                name: "Askademia",
                date: "15 Jan 2026",
                amount: 5000,
                statusLabel: "Received ₹5,000.00",
                statusType: "received",
                avatarClass: "tx-avatar-purple bi-briefcase-fill"
            },
            {
                id: 3,
                name: "Steven Smith",
                date: "15 Jan 2026",
                amount: 500,
                statusLabel: "Pending ₹500.00",
                statusType: "pending",
                avatarClass: "tx-avatar-red bi-exclamation-circle-fill"
            },
            {
                id: 4,
                name: "Apple Podcast",
                date: "15 Jan 2026",
                amount: 12,
                statusLabel: "Subscribe ₹12.00",
                statusType: "sent",
                avatarClass: "tx-avatar-teal bi-apple"
            }
        ];
    }, [transactions]);

    async function handleQuickSubmit(e) {
        e.preventDefault();

        // Enforce: Cannot debit money if balance is zero or insufficient
        if (quickForm.type === "Expense") {
            if (totalBalance <= 0) {
                alert("Transaction Declined: Your available balance is ₹0.00. You cannot debit or withdraw money when balance is zero. Please deposit/credit funds first.");
                return;
            }
            if (Number(quickForm.amount) > totalBalance) {
                alert(`Transaction Declined: Insufficient balance. Available balance is ${formatINR(totalBalance)}, which is less than requested debit of ₹${Number(quickForm.amount).toFixed(2)}.`);
                return;
            }
        }

        try {
            await API.post("/transactions", quickForm);
            setShowQuickModal(false);
            setQuickForm({
                title: "",
                amount: "",
                type: totalBalance <= 0 ? "Income" : "Expense",
                category: "General",
                description: "",
                transaction_date: new Date().toISOString().slice(0, 10)
            });
            loadData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to record transaction");
        }
    }

    if (loading) {
        return (
            <div className="page-container text-center py-5">
                <div className="spinner-border text-primary mb-3"></div>
                <h5 className="fw-bold">Loading Financial Workspace...</h5>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* =================================================================
                HERO SECTION: TOTAL BALANCE | USER-MANAGED CARDS VAULT
                ================================================================= */}
            <div className="row g-4 mb-4 align-items-stretch">
                {/* 1. Total Balance Column */}
                <div className="col-12 col-xl-4 col-lg-5">
                    <div className="official-card hero-balance-box">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <div className="hero-balance-label">Your total balance</div>
                                <div className="hero-balance-amount">
                                    {formatINR(totalBalance)}
                                </div>
                            </div>
                            <button
                                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 px-3 py-1 mt-1"
                                style={{ borderRadius: "10px", fontWeight: 600, fontSize: "0.82rem" }}
                                onClick={() => setShowQuickModal(true)}
                                title="Record a quick financial transaction"
                            >
                                <i className="bi bi-plus-lg"></i>
                                <span>Entry</span>
                            </button>
                        </div>

                        <div className="hero-balance-substats">
                            <div className="hero-stat-pill">
                                <div className="hero-stat-indicator income">
                                    <i className="bi bi-arrow-up"></i>
                                    <span>{formatINR(todayIncome)}</span>
                                </div>
                                <span className="hero-stat-subtext">Today's Income</span>
                            </div>

                            <div className="hero-stat-pill">
                                <div className="hero-stat-indicator expense">
                                    <i className="bi bi-arrow-down"></i>
                                    <span>{formatINR(todayExpenses)}</span>
                                </div>
                                <span className="hero-stat-subtext">Today's Spending</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. USER-MANAGED MULTI-CARD VAULT (Overlayed Cards Stack & Modal Popup) */}
                <div className="col-12 col-xl-8 col-lg-7">
                    <div className="official-card d-flex align-items-center justify-content-center p-3 h-100 position-relative">
                        <div className="bank-cards-deck-container justify-content-center">
                            {/* User's Overlayed Cards Stack */}
                            {cards.length > 0 && (
                                <div className="bank-cards-stacked-group">
                                    {cards.map((card, idx) => {
                                        const gradient = THEME_CLASSES[card.theme] || "bank-card-blue";

                                        return (
                                            <div
                                                key={card.id}
                                                className={`bank-card bank-card-stacked ${gradient}`}
                                                style={{ zIndex: idx + 1 }}
                                                onClick={() => setSelectedCard(card)}
                                                title={`Click to view ${card.card_name} in detail`}
                                            >
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <span className="bank-card-amount">
                                                            {formatINR(card.balance)}
                                                        </span>
                                                        <div className="bank-card-badge-pill mt-1 text-truncate" style={{ maxWidth: "110px" }}>
                                                            {card.card_name}
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className="bi bi-cpu bank-card-chip fs-5"></i>
                                                        <button
                                                            className="bank-card-delete-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCard(card.id, card.card_name);
                                                            }}
                                                            title={`Remove "${card.card_name}" vault`}
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bank-card-number">
                                                    {card.card_number}
                                                </div>

                                                <div className="bank-card-footer">
                                                    <span className="bank-card-name" title={card.card_holder}>
                                                        {card.card_holder}
                                                    </span>
                                                    <span>{card.expiry_date}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* User-Requested Dashed Add Vault Card Slot (Hidden when user reaches 4 cards) */}
                            {cards.length < 4 && (
                                <div
                                    className="bank-card-add-slot"
                                    onClick={() => setShowAddCardModal(true)}
                                    title={`Click to manually add a new bank card (${cards.length}/4 used)`}
                                >
                                    <div className="bank-card-add-circle">
                                        <i className="bi bi-plus"></i>
                                    </div>
                                    <div className="bank-card-add-title">+ Add Vault</div>
                                    <div className="bank-card-add-sub">Custom Card ({cards.length}/4)</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* =================================================================
                LOWER SECTION (2 COLUMNS): ACTIVITIES | MY TRANSACTIONS
                ================================================================= */}
            <div className="row g-4">
                {/* Column 1: Activities (Smooth Spline Wave Chart) */}
                <div className="col-12 col-xl-7 col-lg-7">
                    <div className="official-card h-100 d-flex flex-column justify-content-between">
                        <div className="card-header-clean">
                            <h3 className="card-title-clean">Activities</h3>
                            <select
                                className="timeframe-select-pill"
                                value={activityPeriod}
                                onChange={(e) => setActivityPeriod(e.target.value)}
                            >
                                <option value="This Week">This Week</option>
                                <option value="This Month">This Month</option>
                                <option value="Last 30 Days">Last 30 Days</option>
                            </select>
                        </div>

                        <div style={{ height: 260, position: "relative" }}>
                            <Line data={activitiesData} options={activitiesOptions} />
                        </div>
                    </div>
                </div>

                {/* Column 2: My Transactions */}
                <div className="col-12 col-xl-5 col-lg-5">
                    <div className="official-card h-100 d-flex flex-column justify-content-between">
                        <div className="card-header-clean">
                            <h3 className="card-title-clean">My Transactions</h3>
                            <Link to="/transactions" className="card-link-clean">
                                <span>See All</span>
                            </Link>
                        </div>

                        <div className="tx-list-modern">
                            {recentTxList.map((tx) => (
                                <div key={tx.id} className="tx-item-modern">
                                    <div className={`tx-item-avatar ${tx.avatarClass}`}></div>
                                    <div className="tx-item-info">
                                        <span className="tx-item-title">{tx.name}</span>
                                        <span className="tx-item-date">{tx.date}</span>
                                    </div>
                                    <span className={`tx-status-pill ${tx.statusType}`}>
                                        {tx.statusType === "sent" && <i className="bi bi-arrow-up-right me-1"></i>}
                                        {tx.statusType === "received" && <i className="bi bi-check-circle-fill me-1"></i>}
                                        {tx.statusType === "pending" && <i className="bi bi-exclamation-circle-fill me-1"></i>}
                                        {tx.statusLabel}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Manually Add New Vault / Card */}
            {showAddCardModal && (
                <div className="modal show d-block" style={{ backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "420px" }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "20px" }}>
                            <div className="modal-header border-0 px-4 pt-4 pb-1">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="sidebar-brand-mark" style={{ width: "36px", height: "36px", fontSize: "1rem" }}>
                                        <i className="bi bi-wallet2"></i>
                                    </div>
                                    <h5 className="modal-title fw-bold mb-0">Add Vault / Card</h5>
                                </div>
                                <div className="d-flex align-items-center gap-2 ms-auto me-1">
                                    <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1 rounded-pill">
                                        {cards.length}/4 Used
                                    </span>
                                    <button type="button" className="btn-close" onClick={() => setShowAddCardModal(false)}></button>
                                </div>
                            </div>
                            <form onSubmit={handleAddCardSubmit}>
                                <div className="modal-body px-4 py-2">
                                    {/* Vault Name */}
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted mb-1">Vault / Card Name</label>
                                        <input
                                            type="text"
                                            className="form-control-official w-100"
                                            placeholder="e.g. Salary Vault, SBI Savings, Travel Card"
                                            required
                                            value={cardForm.card_name}
                                            onChange={(e) => setCardForm({ ...cardForm, card_name: e.target.value })}
                                        />
                                    </div>

                                    {/* Network & Last 4 Digits */}
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted mb-1">Network</label>
                                            <select
                                                className="form-select-official w-100"
                                                value={cardForm.card_network}
                                                onChange={(e) => setCardForm({ ...cardForm, card_network: e.target.value })}
                                            >
                                                <option value="VISA">VISA</option>
                                                <option value="MasterCard">MasterCard</option>
                                                <option value="RuPay">RuPay</option>
                                                <option value="Amex">Amex</option>
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold text-muted mb-1">Last 4 Digits</label>
                                            <input
                                                type="text"
                                                maxLength="4"
                                                className="form-control-official w-100"
                                                placeholder="e.g. 4785"
                                                required
                                                value={cardForm.card_number}
                                                onChange={(e) => setCardForm({ ...cardForm, card_number: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Balance in INR */}
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted mb-1">Vault Balance (INR ₹)</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0 fw-bold">₹</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control-official w-auto flex-1"
                                                placeholder="50000.00"
                                                required
                                                value={cardForm.balance}
                                                onChange={(e) => setCardForm({ ...cardForm, balance: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Cardholder & Expiry */}
                                    <div className="row g-2 mb-3">
                                        <div className="col-7">
                                            <label className="form-label small fw-bold text-muted mb-1">Cardholder Name</label>
                                            <input
                                                type="text"
                                                className="form-control-official w-100"
                                                required
                                                value={cardForm.card_holder}
                                                onChange={(e) => setCardForm({ ...cardForm, card_holder: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-5">
                                            <label className="form-label small fw-bold text-muted mb-1">Expiry (MM/YY)</label>
                                            <input
                                                type="text"
                                                className="form-control-official w-100"
                                                placeholder="05/28"
                                                required
                                                value={cardForm.expiry_date}
                                                onChange={(e) => setCardForm({ ...cardForm, expiry_date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Color Theme Selector */}
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted mb-2 d-block">Vault Card Color</label>
                                        <div className="d-flex gap-3">
                                            {[
                                                { id: "blue", label: "Royal Blue", bg: "linear-gradient(135deg, #4338CA, #2563EB)" },
                                                { id: "green", label: "Emerald Green", bg: "linear-gradient(135deg, #059669, #10B981)" },
                                                { id: "purple", label: "Violet Purple", bg: "linear-gradient(135deg, #7C3AED, #6366F1)" },
                                                { id: "coral", label: "Sunset Rose", bg: "linear-gradient(135deg, #E11D48, #FB7185)" }
                                            ].map((th) => (
                                                <div
                                                    key={th.id}
                                                    onClick={() => setCardForm({ ...cardForm, theme: th.id })}
                                                    style={{
                                                        width: "36px",
                                                        height: "36px",
                                                        borderRadius: "12px",
                                                        background: th.bg,
                                                        cursor: "pointer",
                                                        border: cardForm.theme === th.id ? "3px solid #0F172A" : "2px solid transparent",
                                                        boxShadow: cardForm.theme === th.id ? "0 0 0 2px #6366F1" : "none",
                                                        transition: "all 0.15s ease"
                                                    }}
                                                    title={th.label}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-0 px-4 pb-4 pt-1">
                                    <button type="button" className="btn btn-light" onClick={() => setShowAddCardModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-official-primary">
                                        + Add Vault
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Record Transaction / Add Funds */}
            {showQuickModal && (
                <div className="modal show d-block" style={{ backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "20px" }}>
                            <div className="modal-header border-0 px-4 pt-4 pb-2">
                                <h5 className="modal-title fw-bold">Record Transaction / Add Funds</h5>
                                <button type="button" className="btn-close" onClick={() => setShowQuickModal(false)}></button>
                            </div>
                            <form onSubmit={handleQuickSubmit}>
                                <div className="modal-body px-4 py-3">
                                    {totalBalance <= 0 && (
                                        <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-3" style={{ borderRadius: "10px" }}>
                                            <i className="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
                                            <div>
                                                <strong>Balance is ₹0.00:</strong> Debit is disabled. Please credit funds first.
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Flow Type</label>
                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className={`btn flex-1 ${quickForm.type === "Income" ? "btn-success" : "btn-outline-secondary"}`}
                                                style={{ borderRadius: "10px", flex: 1 }}
                                                onClick={() => setQuickForm({ ...quickForm, type: "Income" })}
                                            >
                                                <i className="bi bi-arrow-down-left me-1"></i> Credit (Income)
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn flex-1 ${quickForm.type === "Expense" ? "btn-danger" : "btn-outline-secondary"}`}
                                                style={{ borderRadius: "10px", flex: 1, opacity: totalBalance <= 0 ? 0.45 : 1 }}
                                                onClick={() => {
                                                    if (totalBalance <= 0) {
                                                        alert("Transaction Declined: Available balance is ₹0.00. You cannot debit money when balance is zero. Please deposit/credit funds first.");
                                                        return;
                                                    }
                                                    setQuickForm({ ...quickForm, type: "Expense" });
                                                }}
                                                title={totalBalance <= 0 ? "Debit disabled: Available balance is zero" : "Debit (Expense)"}
                                            >
                                                <i className="bi bi-arrow-up-right me-1"></i> Debit (Expense)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Title / Particulars</label>
                                        <input
                                            type="text"
                                            className="form-control-official w-100"
                                            placeholder="e.g. Salary Deposit, Grocery, Bills"
                                            required
                                            value={quickForm.title}
                                            onChange={(e) => setQuickForm({ ...quickForm, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Amount in INR (₹)</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0 fw-bold">₹</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control-official w-auto flex-1"
                                                placeholder="0.00"
                                                required
                                                value={quickForm.amount}
                                                onChange={(e) => setQuickForm({ ...quickForm, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Remarks / Note (Optional)</label>
                                        <input
                                            type="text"
                                            className="form-control-official w-100"
                                            placeholder="e.g. Monthly transfer, reference note"
                                            value={quickForm.description}
                                            onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Transaction Date</label>
                                        <input
                                            type="date"
                                            className="form-control-official w-100"
                                            required
                                            value={quickForm.transaction_date}
                                            onChange={(e) => setQuickForm({ ...quickForm, transaction_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-0 px-4 pb-4 pt-0">
                                    <button type="button" className="btn btn-light" onClick={() => setShowQuickModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-official-primary">
                                        Save & Sync
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* BIG HOVER POPUP MODAL IN CENTER OF WEB PAGE ON CARD CLICK */}
            {selectedCard && (
                <div
                    className="card-modal-backdrop"
                    onClick={() => setSelectedCard(null)}
                >
                    <div
                        className="card-detail-popup"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1 rounded-pill">
                                    VAULT DETAILS
                                </span>
                                <h5 className="mb-0 fw-bold text-dark">{selectedCard.card_name}</h5>
                            </div>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setSelectedCard(null)}
                                aria-label="Close"
                            ></button>
                        </div>

                        {/* BIG HIGH-RESOLUTION CARD */}
                        <div className={`big-bank-card ${THEME_CLASSES[selectedCard.theme] || "bank-card-blue"}`}>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="big-bank-card-balance-label">Total Vault Balance</div>
                                    <div className="big-bank-card-amount">
                                        {formatINR(selectedCard.balance)}
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-broadcast fs-4 opacity-75"></i>
                                    <span className="badge bg-white text-dark fw-bold px-2 py-1 rounded-pill shadow-sm">
                                        {selectedCard.card_network || "VISA"}
                                    </span>
                                </div>
                            </div>

                            <div className="d-flex align-items-center justify-content-between my-2">
                                <i className="bi bi-cpu big-bank-card-chip"></i>
                                <div className="big-bank-card-number">
                                    {selectedCard.card_number}
                                </div>
                            </div>

                            <div className="big-bank-card-footer">
                                <div>
                                    <div className="big-bank-card-holder-label">Card Holder</div>
                                    <div className="big-bank-card-holder-name">
                                        {selectedCard.card_holder}
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="big-bank-card-holder-label">Expires</div>
                                    <div className="big-bank-card-expiry">
                                        {selectedCard.expiry_date}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="card-detail-info-grid">
                            <div className="card-detail-info-item">
                                <span className="info-label">Vault</span>
                                <span className="info-val">{selectedCard.card_name}</span>
                            </div>
                            <div className="card-detail-info-item">
                                <span className="info-label">Network</span>
                                <span className="info-val">{selectedCard.card_network || "VISA"}</span>
                            </div>
                            <div className="card-detail-info-item">
                                <span className="info-label">Status</span>
                                <span className="info-val text-success">
                                    <i className="bi bi-check-circle-fill me-1"></i> Active
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="card-detail-actions">
                            <button
                                type="button"
                                className="btn btn-outline-danger d-flex align-items-center gap-2"
                                style={{ borderRadius: "12px", fontWeight: 600, fontSize: "0.88rem", padding: "8px 16px" }}
                                onClick={() => {
                                    handleDeleteCard(selectedCard.id, selectedCard.card_name);
                                    setSelectedCard(null);
                                }}
                            >
                                <i className="bi bi-trash3"></i> Remove Vault
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary px-4"
                                style={{ borderRadius: "12px", fontWeight: 600, fontSize: "0.88rem", padding: "8px 24px" }}
                                onClick={() => setSelectedCard(null)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
