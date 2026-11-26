/**
 * ==============================================================================
 * BUDGET CEILINGS (FEATURE DISABLED / COMMENTED OUT)
 * ==============================================================================
 * All code for the Budget Ceilings feature has been commented out below.
 * To re-enable:
 * 1. Uncomment the component implementation below.
 * 2. Uncomment the route in frontend/src/App.jsx.
 * 3. Uncomment the sidebar link in frontend/src/components/Sidebar.jsx.
 * 4. Uncomment the API mount in backend/server.js.
 * ==============================================================================
 */

/*
import { useEffect, useState } from "react";
import API from "../services/api";
import { formatINR, preventNegativeInput, sanitizePositiveAmount } from "../utils/currency";

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

    const expenseCategories = categories.filter((c) => c.type === "Expense");

    const spentInCategory = (cat) => {
        return transactions
            .filter(
                (t) =>
                    t.type === "Expense" &&
                    t.category === cat &&
                    t.transaction_date.slice(0, 7) === selectedMonth
            )
            .reduce((sum, t) => sum + Number(t.amount), 0);
    };

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + spentInCategory(b.category), 0);
    const remainingBudget = totalBudget - totalSpent;

    function handleChange(e) {
        const { name, value } = e.target;
        const sanitized = name === "amount" ? sanitizePositiveAmount(value) : value;
        setFormData({ ...formData, [name]: sanitized });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const numAmount = Number(formData.amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            alert("Ceiling limit must be greater than ₹0.00. Money cannot be negative or zero.");
            return;
        }
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

    if (loading) {
        return (
            <div className="page-container text-center py-5">
                <div className="spinner-border text-primary mb-3"></div>
                <h5 className="fw-bold">Loading Budget Planning...</h5>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <h2 className="page-title mb-1">
                        <i className="bi bi-piggy-bank text-primary me-2"></i>
                        Budget Ceilings & Allocations
                    </h2>
                    <p className="page-subtitle mb-0">Manage category expenditure limits and guardrails</p>
                </div>

                <div className="d-flex gap-2">
                    <input
                        type="month"
                        className="form-control-official"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                    <button
                        className="btn-official-primary text-nowrap"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <i className={`bi bi-${showForm ? "dash" : "plus"}-lg me-1`}></i>
                        {showForm ? "Close Form" : "Set Ceiling"}
                    </button>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                    <div className="official-card p-3">
                        <span className="text-muted small fw-semibold">Total Monthly Budget</span>
                        <h3 className="fw-bold mt-1 mb-0 text-primary">{formatINR(totalBudget)}</h3>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="official-card p-3">
                        <span className="text-muted small fw-semibold">Net Remaining Guardrail</span>
                        <h3 className={`fw-bold mt-1 mb-0 ${remainingBudget >= 0 ? "text-success" : "text-danger"}`}>
                            {formatINR(remainingBudget)}
                        </h3>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="official-card p-4 mb-4">
                    <h5 className="fw-bold mb-3" style={{ fontSize: "1.05rem" }}>Set Category Budget Ceiling</h5>
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-12 col-md-5">
                                <label className="form-label fw-semibold small text-muted">Expenditure Category</label>
                                <select
                                    name="category"
                                    className="form-select-official"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Target Category</option>
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
                                        onKeyDown={preventNegativeInput}
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

            <div className="row g-3">
                {budgets.map((b) => {
                    const spent = spentInCategory(b.category);
                    const rem = Number(b.amount) - spent;
                    const pct = Math.min(100, Math.round((spent / Number(b.amount)) * 100)) || 0;
                    const isExceeded = spent > Number(b.amount);

                    return (
                        <div key={b.id} className="col-12 col-md-6 col-xl-4">
                            <div className="official-card p-3 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "1rem" }}>
                                            {b.category}
                                        </h5>
                                        <button
                                            className="btn btn-sm btn-link text-danger p-0 border-0"
                                            onClick={() => handleDelete(b.id)}
                                            title="Delete allocation"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>

                                    <div className="progress mb-2" style={{ height: "6px" }}>
                                        <div
                                            className={`progress-bar ${isExceeded ? "bg-danger" : pct > 80 ? "bg-warning" : "bg-primary"}`}
                                            role="progressbar"
                                            style={{ width: `${pct}%` }}
                                        ></div>
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
*/

export default function Budget() {
    return null;
}
