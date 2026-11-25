import { useEffect, useState } from "react";
import API from "../services/api";
import { formatINR } from "../utils/currency";

function getMonthKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function getMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleString("en-IN", {
        month: "long",
        year: "numeric"
    });
}

function Budget() {
    const [budgets, setBudgets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        category: "",
        amount: "",
        month: getMonthKey()
    });

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    async function fetchData() {
        try {
            const [budgetRes, transactionRes, categoryRes] = await Promise.all([
                API.get(`/budgets/month/${selectedMonth}`),
                API.get("/transactions"),
                API.get("/categories")
            ]);
            setBudgets(budgetRes.data || []);
            setTransactions(transactionRes.data || []);
            setCategories(categoryRes.data || []);
        } catch (error) {
            console.error("Error fetching budget data:", error);
        } finally {
            setLoading(false);
        }
    }

    const spentInCategory = (categoryName) => {
        return transactions
            .filter(
                (t) =>
                    t.category === categoryName &&
                    t.type === "Expense" &&
                    getMonthKey(new Date(t.transaction_date)) === selectedMonth
            )
            .reduce((sum, t) => sum + Number(t.amount), 0);
    };

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + spentInCategory(b.category), 0);
    const remainingBudget = totalBudget - totalSpent;

    function handleChange(e) {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await API.post("/budgets", { ...formData, month: selectedMonth });
            setShowForm(false);
            setFormData({ category: "", amount: "", month: selectedMonth });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save budget");
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Permanently delete this budget allocation?")) return;
        try {
            await API.delete(`/budgets/${id}`);
            fetchData();
        } catch {
            alert("Failed to delete budget");
        }
    }

    const expenseCategories = categories.filter((c) => c.type === "Expense");

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3"></div>
                <h5 className="fw-bold">Loading Budget Planning...</h5>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <h2 className="fw-bold mb-1" style={{ fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
                        Budget Ceilings & Allocations
                    </h2>
                    <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                        Active Cycle: <strong>{getMonthLabel(selectedMonth)}</strong> &bull; Currency: <strong>INR (₹)</strong>
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <input
                        type="month"
                        className="form-control-official w-auto"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                    <button
                        className="btn-official-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <i className="bi bi-plus-lg"></i>
                        <span>{showForm ? "Cancel" : "Set Ceiling"}</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="official-card p-4">
                        <span className="text-muted small fw-semibold">Total Monthly Budget</span>
                        <h3 className="fw-bold mt-1 mb-0 text-primary">{formatINR(totalBudget)}</h3>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="official-card p-4">
                        <span className="text-muted small fw-semibold">Disbursed Outflow</span>
                        <h3 className="fw-bold mt-1 mb-0 text-danger">{formatINR(totalSpent)}</h3>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="official-card p-4">
                        <span className="text-muted small fw-semibold">Unspent Cushion</span>
                        <h3 className={`fw-bold mt-1 mb-0 ${remainingBudget >= 0 ? "text-success" : "text-danger"}`}>
                            {formatINR(remainingBudget)}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Add Budget Allocation Form */}
            {showForm && (
                <div className="official-card p-4 mb-4">
                    <h5 className="fw-bold mb-3" style={{ fontSize: "1.05rem" }}>Set Category Budget Ceiling</h5>
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3 align-items-end">
                            <div className="col-12 col-md-5">
                                <label className="form-label fw-semibold small text-muted">Expense Category</label>
                                <select
                                    name="category"
                                    className="form-select-official"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select category...</option>
                                    {expenseCategories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-12 col-md-4">
                                <label className="form-label fw-semibold small text-muted">Ceiling Limit in INR (₹)</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-body-tertiary fw-bold text-muted border-end-0">₹</span>
                                    <input
                                        type="number"
                                        name="amount"
                                        className="form-control-official border-start-0"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-12 col-md-3">
                                <button type="submit" className="btn-official-primary w-100 justify-content-center">
                                    Save Ceiling
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Budget Allocations Grid */}
            <div className="row g-3">
                {budgets.map((b) => {
                    const spent = spentInCategory(b.category);
                    const rem = Number(b.amount) - spent;
                    const percent = Math.min(100, (spent / Number(b.amount)) * 100);

                    return (
                        <div className="col-12 col-md-6 col-lg-4" key={b.id}>
                            <div className="official-card p-3 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <div className="fw-bold mb-0" style={{ fontSize: "1rem" }}>{b.category}</div>
                                            <span className="text-muted small">{getMonthLabel(b.month)}</span>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-outline-danger py-1 px-2"
                                            onClick={() => handleDelete(b.id)}
                                            title="Delete Allocation"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>

                                    {/* Progress */}
                                    <div className="my-3">
                                        <div className="d-flex justify-content-between mb-1 small">
                                            <span className="text-muted">Utilization</span>
                                            <span className={`fw-bold ${percent >= 100 ? "text-danger" : "text-body"}`}>
                                                {percent.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="progress-official">
                                            <div
                                                className="progress-bar-official"
                                                style={{
                                                    width: `${percent}%`,
                                                    backgroundColor: percent >= 100 ? "var(--color-danger)" : percent >= 80 ? "var(--color-warning)" : "var(--color-success)"
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-top d-flex justify-content-between small">
                                    <div>
                                        <span className="text-muted d-block">Limit</span>
                                        <strong>{formatINR(b.amount)}</strong>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-muted d-block">Spent</span>
                                        <strong className="text-danger">{formatINR(spent)}</strong>
                                    </div>
                                    <div className="text-end">
                                        <span className="text-muted d-block">Remaining</span>
                                        <strong className={rem >= 0 ? "text-success" : "text-danger"}>
                                            {formatINR(rem)}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {budgets.length === 0 && (
                    <div className="col-12">
                        <div className="official-card text-center py-5 text-muted">
                            <i className="bi bi-piggy-bank fs-2 d-block mb-2"></i>
                            <p className="mb-2">No budget allocations configured for {getMonthLabel(selectedMonth)}.</p>
                            <button
                                className="btn-official-primary"
                                onClick={() => setShowForm(true)}
                            >
                                Set First Ceiling
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Budget;
