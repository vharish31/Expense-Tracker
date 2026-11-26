import { preventNegativeInput } from "../utils/currency";

function TransactionForm({
    formData,
    netBalance = 0,
    cards = [],
    onChange,
    onSubmit,
    onCancel
}) {
    return (
        <div className="official-card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <h4 className="fw-bold mb-0" style={{ fontSize: "1.1rem" }}>
                    Record New Financial Transaction
                </h4>
                <button
                    type="button"
                    className="btn-close"
                    onClick={onCancel}
                    aria-label="Close"
                ></button>
            </div>

            {netBalance <= 0 && (
                <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-3" style={{ borderRadius: "10px" }}>
                    <i className="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
                    <div>
                        <strong>Account Balance is ₹0.00:</strong> You cannot debit or withdraw money without funds. Please deposit (Credit) funds first.
                    </div>
                </div>
            )}

            <form onSubmit={onSubmit}>
                <div className="row g-3">
                    <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold small text-muted">Transaction Particulars</label>
                        <input
                            type="text"
                            name="title"
                            className="form-control-official"
                            placeholder="e.g. Salary Deposit, Client Settlement, Grocery, Office Rent"
                            value={formData.title}
                            onChange={onChange}
                            required
                        />
                    </div>

                    <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold small text-muted">Amount in INR (₹)</label>
                        <div className="input-group">
                            <span className="input-group-text bg-body-tertiary fw-bold text-muted border-end-0">₹</span>
                            <input
                                type="number"
                                name="amount"
                                className="form-control-official border-start-0"
                                placeholder="0.00"
                                value={formData.amount}
                                onKeyDown={preventNegativeInput}
                                onChange={onChange}
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small text-muted">Flow Type</label>
                        <select
                            name="type"
                            className="form-select-official"
                            value={formData.type}
                            onChange={(e) => {
                                if (e.target.value === "Expense" && netBalance <= 0) {
                                    alert("Transaction Declined: Available balance is ₹0.00. You cannot debit money when balance is zero. Please deposit/credit funds first.");
                                    return;
                                }
                                onChange(e);
                            }}
                        >
                            <option value="Income">Credit (₹) - Deposit / Inflow</option>
                            <option value="Expense" disabled={netBalance <= 0}>
                                Debit (₹) - Withdrawal / Outflow {netBalance <= 0 ? "(Disabled: ₹0 Balance)" : ""}
                            </option>
                        </select>
                    </div>

                    {cards && cards.length > 0 && (
                        <div className="col-12 col-md-4">
                            <label className="form-label fw-semibold small text-muted">Vault Card</label>
                            <select
                                name="card_id"
                                className="form-select-official"
                                value={formData.card_id || (cards[0] && cards[0].id) || ""}
                                onChange={onChange}
                            >
                                {cards.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.card_name} (₹{Number(c.balance).toFixed(2)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small text-muted">Ref. / UTR Number</label>
                        <input
                            type="text"
                            name="ref_no"
                            className="form-control-official"
                            placeholder="e.g. UPI/492019482104 (Optional)"
                            value={formData.ref_no || ""}
                            onChange={onChange}
                        />
                    </div>

                    <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small text-muted">Transaction Date</label>
                        <input
                            type="date"
                            name="transaction_date"
                            className="form-control-official"
                            value={formData.transaction_date}
                            onChange={onChange}
                            required
                        />
                    </div>

                    <div className="col-12">
                        <label className="form-label fw-semibold small text-muted">Memo / Description (Optional)</label>
                        <input
                            type="text"
                            name="description"
                            className="form-control-official"
                            placeholder="Add reference notes, invoice number, or payment details..."
                            value={formData.description || ""}
                            onChange={onChange}
                        />
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
                    <button
                        type="button"
                        className="btn-official-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn-official-primary">
                        <i className="bi bi-check2"></i>
                        <span>Save Entry to Passbook</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default TransactionForm;
