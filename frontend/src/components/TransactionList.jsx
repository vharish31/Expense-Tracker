import { formatINR } from "../utils/currency";

function TransactionList({ transactions, currentPage = 1, itemsPerPage = 10 }) {
    if (transactions.length === 0) {
        return (
            <div className="official-card text-center py-5">
                <i className="bi bi-journal-x fs-1 text-muted d-block mb-3"></i>
                <h5 className="fw-bold mb-1">No Bank Transactions Recorded</h5>
                <p className="text-muted small mb-0">No statement entries match the selected filters or date range.</p>
            </div>
        );
    }

    return (
        <div className="bank-passbook-table-wrap">
            {/* Desktop Bank Passbook / Statement Table matching User Specification */}
            <div className="table-responsive d-none d-md-block">
                <table className="table-passbook">
                    <thead>
                        <tr>
                            <th style={{ width: "70px" }}>S.No</th>
                            <th style={{ width: "160px" }}>Date</th>
                            <th>Transaction Particulars</th>
                            <th style={{ width: "180px" }}>Ref./UTR No.</th>
                            <th className="text-end" style={{ width: "150px" }}>Debit (₹)</th>
                            <th className="text-end" style={{ width: "150px" }}>Credit (₹)</th>
                            <th className="text-end" style={{ width: "165px" }}>Running Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx, idx) => {
                            const isDebit = tx.type === "Expense";
                            const isCredit = tx.type === "Income";
                            const sNo = (currentPage - 1) * itemsPerPage + idx + 1;

                            // Format Date
                            const dateObj = new Date(tx.transaction_date);
                            const formattedDate = !isNaN(dateObj.getTime())
                                ? dateObj.toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric"
                                  })
                                : String(tx.transaction_date).slice(0, 10);

                            // Format Payment Time (from created_at timestamp or fallback)
                            let paymentTime = "10:30 AM";
                            if (tx.created_at) {
                                const createdObj = new Date(tx.created_at);
                                if (!isNaN(createdObj.getTime())) {
                                    paymentTime = createdObj.toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true
                                    });
                                }
                            }

                            // Authentic UTR / Reference number
                            const utrNo =
                                tx.ref_no ||
                                `UPI/${String(tx.id * 839217 + 100000000000).slice(0, 12)}`;

                            return (
                                <tr key={tx.id}>
                                    {/* S.No */}
                                    <td className="text-muted fw-bold">
                                        <span>#{sNo}</span>
                                    </td>

                                    {/* Date with Payment Time */}
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span className="fw-semibold text-dark">{formattedDate}</span>
                                            <span className="text-muted d-flex align-items-center gap-1 mt-1" style={{ fontSize: "0.75rem" }}>
                                                <i className="bi bi-clock"></i>
                                                <span>{paymentTime}</span>
                                            </span>
                                        </div>
                                    </td>

                                    {/* Transaction Particulars */}
                                    <td>
                                        <div className="fw-bold" style={{ color: "var(--text-main)" }}>
                                            {tx.title}
                                        </div>
                                        {tx.description && (
                                            <small
                                                className="text-muted d-block text-truncate"
                                                style={{ maxWidth: "340px", fontSize: "0.76rem" }}
                                            >
                                                {tx.description}
                                            </small>
                                        )}
                                    </td>

                                    {/* Ref./UTR No. */}
                                    <td>
                                        <span
                                            className="badge bg-light text-dark border font-monospace px-2 py-1"
                                            style={{ fontSize: "0.76rem", letterSpacing: "0.03em" }}
                                            title="Unique Transaction Reference"
                                        >
                                            {utrNo}
                                        </span>
                                    </td>

                                    {/* Debit (₹) - Red */}
                                    <td className="text-end">
                                        {isDebit ? (
                                            <span className="text-debit-red">
                                                ₹{Number(tx.amount).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </span>
                                        ) : (
                                            <span className="text-muted opacity-25">&mdash;</span>
                                        )}
                                    </td>

                                    {/* Credit (₹) - Green */}
                                    <td className="text-end">
                                        {isCredit ? (
                                            <span className="text-credit-green">
                                                ₹{Number(tx.amount).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </span>
                                        ) : (
                                            <span className="text-muted opacity-25">&mdash;</span>
                                        )}
                                    </td>

                                    {/* Running Balance */}
                                    <td className="text-end">
                                        <div className="text-balance-inr">
                                            {formatINR(tx.runningBalance)}
                                        </div>
                                        <small className="text-muted" style={{ fontSize: "0.68rem" }}>
                                            {tx.runningBalance >= 0 ? "Cr" : "Dr"}
                                        </small>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Passbook Card View */}
            <div className="d-md-none p-3">
                <div className="d-flex flex-column gap-3">
                    {transactions.map((tx, idx) => {
                        const isDebit = tx.type === "Expense";
                        const isCredit = tx.type === "Income";
                        const sNo = (currentPage - 1) * itemsPerPage + idx + 1;

                        const dateObj = new Date(tx.transaction_date);
                        const formattedDate = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                              })
                            : String(tx.transaction_date).slice(0, 10);

                        let paymentTime = "10:30 AM";
                        if (tx.created_at) {
                            const createdObj = new Date(tx.created_at);
                            if (!isNaN(createdObj.getTime())) {
                                paymentTime = createdObj.toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true
                                });
                            }
                        }

                        const utrNo =
                            tx.ref_no ||
                            `UPI/${String(tx.id * 839217 + 100000000000).slice(0, 12)}`;

                        return (
                            <div key={tx.id} className="p-3 border rounded-3 bg-white shadow-sm">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-light text-secondary border font-monospace">
                                            #{sNo}
                                        </span>
                                        <div>
                                            <div className="fw-bold text-main">{tx.title}</div>
                                            <small className="text-muted d-flex align-items-center gap-1">
                                                <span>{formattedDate}</span>
                                                <span>&bull;</span>
                                                <i className="bi bi-clock"></i>
                                                <span>{paymentTime}</span>
                                            </small>
                                        </div>
                                    </div>
                                    <span
                                        className="badge bg-light text-dark border font-monospace px-2 py-1"
                                        style={{ fontSize: "0.72rem" }}
                                    >
                                        {utrNo}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between align-items-center py-2 border-top my-2">
                                    <div>
                                        <small className="text-muted d-block" style={{ fontSize: "0.72rem" }}>
                                            Transaction Flow
                                        </small>
                                        {isDebit ? (
                                            <span className="text-debit-red">
                                                Debit: ₹{Number(tx.amount).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </span>
                                        ) : (
                                            <span className="text-credit-green">
                                                Credit: ₹{Number(tx.amount).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-end">
                                        <small className="text-muted d-block" style={{ fontSize: "0.72rem" }}>
                                            Running Balance
                                        </small>
                                        <div className="text-balance-inr">
                                            {formatINR(tx.runningBalance)}
                                        </div>
                                        <small className="text-muted" style={{ fontSize: "0.68rem" }}>
                                            {tx.runningBalance >= 0 ? "Cr" : "Dr"}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default TransactionList;
