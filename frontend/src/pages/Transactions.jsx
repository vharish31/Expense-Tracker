import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import TransactionForm from "../components/TransactionForm";
import TransactionList from "../components/TransactionList";
import { formatINR } from "../utils/currency";
import { useAuth } from "../context/auth";

const emptyForm = {
    title: "",
    amount: "",
    type: "Expense",
    category: "General",
    ref_no: "",
    description: "",
    transaction_date: new Date().toISOString().slice(0, 10)
};

function Transactions() {
    const { user } = useAuth();

    const [transactions, setTransactions] = useState([]);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [formData, setFormData] = useState(emptyForm);

    async function fetchData() {
        try {
            const [txRes, cardRes] = await Promise.all([
                API.get("/transactions"),
                API.get("/cards").catch(() => ({ data: [] }))
            ]);
            setTransactions(txRes.data || []);
            setCards(cardRes.data || []);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    // Compute authentic chronological running balance for every transaction
    const transactionsWithRunningBalance = useMemo(() => {
        // Sort from oldest to newest to compute running balance accurately
        const sortedChronological = [...transactions].sort((a, b) => {
            const d1 = new Date(a.transaction_date).getTime();
            const d2 = new Date(b.transaction_date).getTime();
            if (d1 !== d2) return d1 - d2;
            return a.id - b.id;
        });

        let cumulative = 0;
        const balanceMap = new Map();

        sortedChronological.forEach((t) => {
            const amt = Number(t.amount) || 0;
            if (t.type === "Income") {
                cumulative += amt;
            } else {
                cumulative -= amt;
            }
            balanceMap.set(t.id, cumulative);
        });

        return transactions.map((t) => ({
            ...t,
            runningBalance: balanceMap.get(t.id) ?? 0
        }));
    }, [transactions]);

    // Total Card Balance from User Vaults
    const totalCardBalance = useMemo(() => {
        return cards.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
    }, [cards]);

    // Statement totals - Net balance reflects card balances automatically
    const { totalCredits, totalDebits, netBalance } = useMemo(() => {
        let cr = 0;
        let dr = 0;
        transactions.forEach((t) => {
            const amt = Number(t.amount) || 0;
            if (t.type === "Income") cr += amt;
            else dr += amt;
        });
        const effectiveNet = cards.length > 0 ? totalCardBalance : (cr - dr);
        return {
            totalCredits: cr,
            totalDebits: dr,
            netBalance: effectiveNet
        };
    }, [transactions, cards, totalCardBalance]);

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return transactionsWithRunningBalance
            .filter((t) => {
                const query = searchTerm.toLowerCase();
                const matchesSearch =
                    !searchTerm ||
                    (t.title && t.title.toLowerCase().includes(query)) ||
                    (t.description && t.description.toLowerCase().includes(query)) ||
                    (t.ref_no && t.ref_no.toLowerCase().includes(query));

                const matchesType = typeFilter === "All" || t.type === typeFilter;

                let matchesDate = true;
                if (startDate) {
                    matchesDate = matchesDate && new Date(t.transaction_date) >= new Date(startDate);
                }
                if (endDate) {
                    matchesDate = matchesDate && new Date(t.transaction_date) <= new Date(endDate);
                }

                return matchesSearch && matchesType && matchesDate;
            })
            .sort((a, b) => {
                let comparison = 0;
                if (sortBy === "date") {
                    comparison = new Date(a.transaction_date) - new Date(b.transaction_date);
                } else if (sortBy === "amount") {
                    comparison = Number(a.amount) - Number(b.amount);
                } else if (sortBy === "title") {
                    comparison = a.title.localeCompare(b.title);
                } else if (sortBy === "balance") {
                    comparison = a.runningBalance - b.runningBalance;
                }
                return sortOrder === "asc" ? comparison : -comparison;
            });
    }, [transactionsWithRunningBalance, searchTerm, typeFilter, startDate, endDate, sortBy, sortOrder]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    function resetForm() {
        setFormData(emptyForm);
        setShowForm(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // Enforce: Cannot debit money if balance is zero or insufficient
        if (formData.type === "Expense") {
            if (netBalance <= 0) {
                alert("Transaction Declined: Your available balance is ₹0.00. You cannot debit or withdraw money when balance is zero. Please deposit/credit funds first.");
                return;
            }
            if (Number(formData.amount) > netBalance) {
                alert(`Transaction Declined: Insufficient balance. Available balance is ₹${netBalance.toFixed(2)}, which is less than requested debit of ₹${Number(formData.amount).toFixed(2)}.`);
                return;
            }
        }

        try {
            await API.post("/transactions", formData);
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error saving transaction:", error);
            alert(error.response?.data?.message || "Failed to save transaction.");
        }
    }

    // Export Statement to CSV matching the 7 Passbook Columns
    function exportStatementCSV() {
        if (transactionsWithRunningBalance.length === 0) {
            alert("No transaction records to export.");
            return;
        }

        const headers = ["S.No", "Date", "Payment Time", "Transaction Particulars", "Ref./UTR No.", "Debit (INR)", "Credit (INR)", "Running Balance (INR)"];
        const rows = transactionsWithRunningBalance.map((t, idx) => {
            const dateStr = t.transaction_date ? String(t.transaction_date).slice(0, 10) : "";
            let timeStr = "10:30 AM";
            if (t.created_at) {
                const cDate = new Date(t.created_at);
                if (!isNaN(cDate.getTime())) {
                    timeStr = cDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                }
            }
            const utrStr = t.ref_no || `UPI/${String(t.id * 839217 + 100000000000).slice(0, 12)}`;
            const debitStr = t.type === "Expense" ? Number(t.amount).toFixed(2) : "0.00";
            const creditStr = t.type === "Income" ? Number(t.amount).toFixed(2) : "0.00";

            return [
                idx + 1,
                `"${dateStr}"`,
                `"${timeStr}"`,
                `"${(t.title || "").replace(/"/g, '""')}"`,
                `"${utrStr}"`,
                debitStr,
                creditStr,
                Number(t.runningBalance).toFixed(2)
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Bank_Passbook_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3"></div>
                <h5 className="fw-bold">Generating Account Statement...</h5>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header & Statement Metadata */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <h2 className="fw-bold mb-1" style={{ fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
                        Bank Account Statement & Passbook
                    </h2>
                    <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                        Account Holder: <strong>{user?.name || "Primary Account Holder"}</strong> &bull; Currency: <strong>INR (₹)</strong>
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap no-print">
                    <button
                        className="btn-official-secondary"
                        onClick={exportStatementCSV}
                        title="Export statement as CSV"
                    >
                        <i className="bi bi-file-earmark-arrow-down"></i>
                        <span>Download CSV</span>
                    </button>

                    <button
                        className="btn-official-secondary"
                        onClick={() => window.print()}
                        title="Print statement"
                    >
                        <i className="bi bi-printer"></i>
                        <span>Print Passbook</span>
                    </button>

                    <button
                        className="btn-official-primary"
                        onClick={() => (showForm ? resetForm() : setShowForm(true))}
                    >
                        <i className="bi bi-plus-lg"></i>
                        <span>{showForm ? "Cancel Entry" : "+ Record Transaction"}</span>
                    </button>
                </div>
            </div>

            {/* Official Bank Statement Header Banner */}
            <div className="bank-statement-header mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge bg-primary bg-opacity-25 text-white border border-primary border-opacity-50 px-2 py-1 rounded-pill" style={{ fontSize: "0.72rem" }}>
                                OFFICIAL PASSBOOK STATEMENT
                            </span>
                            <span className="text-white-50 small">&bull; CBS Reconciled</span>
                        </div>
                        <div className="bank-statement-title">
                            FinTrack National Banking &bull; General Ledger Passbook
                        </div>
                        <div className="text-white-50 small mt-1">
                            A/C Holder: <strong className="text-white">{user?.name || "Treasury Account"}</strong> &bull; A/C No: <strong>•••• •••• 9821</strong> &bull; IFSC: <strong>FTNB0002145</strong> &bull; Branch: <strong>Bengaluru Central</strong>
                        </div>
                    </div>
                    <div className="text-md-end">
                        <span className="text-white-50 small d-block">Statement Generated On</span>
                        <span className="fw-bold text-white">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                </div>
            </div>

            {/* Bank Passbook Balance Strip */}
            <div className="official-card p-3 p-md-4 mb-4">
                <div className="row g-3 text-center text-md-start">
                    <div className="col-12 col-sm-6 col-lg-3 border-end-md">
                        <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.74rem" }}>
                            Net Available Balance
                        </small>
                        <h3 className="fw-bold mb-0 text-primary mt-1" style={{ fontSize: "1.5rem" }}>
                            {formatINR(netBalance)}
                        </h3>
                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>
                            {netBalance >= 0 ? "Credit Balance (In Funds)" : "Overdraft Balance"}
                        </small>
                    </div>

                    <div className="col-12 col-sm-6 col-lg-3 border-end-md">
                        <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.74rem" }}>
                            Total Deposits (Credit)
                        </small>
                        <h3 className="fw-bold mb-0 mt-1" style={{ fontSize: "1.5rem", color: "#059669" }}>
                            ₹{totalCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </h3>
                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>Total Inflow</small>
                    </div>

                    <div className="col-12 col-sm-6 col-lg-3 border-end-md">
                        <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.74rem" }}>
                            Total Withdrawals (Debit)
                        </small>
                        <h3 className="fw-bold mb-0 mt-1" style={{ fontSize: "1.5rem", color: "#DC2626" }}>
                            ₹{totalDebits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </h3>
                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>Total Outflow</small>
                    </div>

                    <div className="col-12 col-sm-6 col-lg-3">
                        <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.74rem" }}>
                            Total Statement Entries
                        </small>
                        <h3 className="fw-bold mb-0 text-body mt-1" style={{ fontSize: "1.5rem" }}>
                            {transactions.length}
                        </h3>
                        <small className="text-muted" style={{ fontSize: "0.72rem" }}>Verified ledger records</small>
                    </div>
                </div>
            </div>

            {/* Entry Form */}
            {showForm && (
                <TransactionForm
                    formData={formData}
                    netBalance={netBalance}
                    cards={cards}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    onCancel={resetForm}
                />
            )}

            {/* Statement Filter & Search Bar */}
            <div className="official-card p-3 mb-4">
                <div className="row g-2 align-items-center">
                    <div className="col-12 col-md-4">
                        <input
                            type="text"
                            className="form-control-official"
                            placeholder="Search particulars, remarks, or UTR..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="col-6 col-md-3">
                        <select
                            className="form-select-official"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="All">All Entries (Cr & Dr)</option>
                            <option value="Income">Credits Only (Deposits)</option>
                            <option value="Expense">Debits Only (Withdrawals)</option>
                        </select>
                    </div>

                    <div className="col-6 col-md-2">
                        <input
                            type="date"
                            className="form-control-official"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="From Date"
                        />
                    </div>

                    <div className="col-12 col-md-3">
                        <select
                            className="form-select-official"
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split("-");
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                        >
                            <option value="date-desc">Date: Newest First</option>
                            <option value="date-asc">Date: Oldest First</option>
                            <option value="amount-desc">Amount: High to Low</option>
                            <option value="amount-asc">Amount: Low to High</option>
                            <option value="balance-desc">Balance: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Statement Table View with S.No, Date with Time, Particulars, Ref./UTR, Debit, Credit, Running Balance */}
            <TransactionList
                transactions={paginatedTransactions}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                    <span className="text-muted small fw-semibold">
                        Showing {paginatedTransactions.length} of {filteredTransactions.length} statement entries
                    </span>

                    <div className="btn-group btn-group-sm">
                        <button
                            className="btn btn-outline-secondary"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                className={`btn ${currentPage === i + 1 ? "btn-primary" : "btn-outline-secondary"}`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className="btn btn-outline-secondary"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Transactions;
