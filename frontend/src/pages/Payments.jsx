import { useEffect, useState, useMemo } from "react";
import API from "../services/api";
import { useAuth } from "../context/auth";
import { formatINR } from "../utils/currency";

function Payments() {
    const { user, updateUser } = useAuth();

    // Data States
    const [cards, setCards] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form States
    const [recipientPhone, setRecipientPhone] = useState("");
    const [verifiedRecipient, setVerifiedRecipient] = useState(null);
    const [lookingUp, setLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState("");

    const [amount, setAmount] = useState("");
    const [selectedCardId, setSelectedCardId] = useState("");
    const [notes, setNotes] = useState("");
    const [paying, setPaying] = useState(false);

    // PIN Verification States
    const [showPinModal, setShowPinModal] = useState(false);
    const [enteredPin, setEnteredPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [showEnteredPin, setShowEnteredPin] = useState(false);

    // Set / Change PIN States
    const [showSetPinModal, setShowSetPinModal] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [confirmNewPin, setConfirmNewPin] = useState("");
    const [changePinError, setChangePinError] = useState("");
    const [settingPin, setSettingPin] = useState(false);

    // Feedback States
    const [paymentSuccess, setPaymentSuccess] = useState(null);
    const [paymentError, setPaymentError] = useState("");

    // Load User's Cards and Transfer History
    async function loadPaymentData() {
        try {
            const [cardsRes, historyRes] = await Promise.all([
                API.get("/cards").catch(() => ({ data: [] })),
                API.get("/payments/history").catch(() => ({ data: [] }))
            ]);

            const userCards = cardsRes.data || [];
            setCards(userCards);
            if (userCards.length > 0 && !selectedCardId) {
                setSelectedCardId(String(userCards[0].id));
            }

            setHistory(historyRes.data || []);
        } catch (err) {
            console.error("Error loading payment data:", err);
        } finally {
            setLoadingData(false);
        }
    }

    // Ensure user profile has has_pin populated
    useEffect(() => {
        loadPaymentData();

        if (user && user.has_pin === undefined) {
            API.get("/auth/me")
                .then((res) => {
                    if (res.data?.user && updateUser) {
                        updateUser({ has_pin: Boolean(res.data.user.has_pin) });
                    }
                })
                .catch(() => {});
        }
    }, []);

    // Total available card balance
    const totalBalance = useMemo(() => {
        return cards.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
    }, [cards]);

    // Currently selected card object
    const activePayingCard = useMemo(() => {
        if (!selectedCardId && cards.length > 0) return cards[0];
        return cards.find((c) => String(c.id) === String(selectedCardId)) || cards[0] || null;
    }, [cards, selectedCardId]);

    // Live or Manual Mobile Lookup
    async function handleLookupRecipient(phoneToLookup) {
        const clean = String(phoneToLookup || recipientPhone).replace(/\D/g, "").slice(-10);
        if (clean.length !== 10) {
            setVerifiedRecipient(null);
            setLookupError("Please enter a complete 10-digit mobile number");
            return;
        }

        if (user?.phone && clean === String(user.phone).slice(-10)) {
            setVerifiedRecipient(null);
            setLookupError("Self-transfer not allowed: You cannot pay to your own mobile number.");
            return;
        }

        setLookingUp(true);
        setLookupError("");
        setVerifiedRecipient(null);

        try {
            const res = await API.get(`/payments/lookup?phone=${clean}`);
            setVerifiedRecipient(res.data.user);
            setLookupError("");
        } catch (err) {
            setVerifiedRecipient(null);
            setLookupError(err.response?.data?.message || "No registered user found with this mobile number");
        } finally {
            setLookingUp(false);
        }
    }

    // Auto-lookup when user finishes entering 10 digits
    function handlePhoneChange(e) {
        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
        setRecipientPhone(val);
        setPaymentError("");
        setPaymentSuccess(null);

        if (val.length === 10) {
            handleLookupRecipient(val);
        } else {
            setVerifiedRecipient(null);
            setLookupError("");
        }
    }

    // Step 1: Initiate Transfer form submit -> validate inputs and prompt for PIN
    function handleInitiatePayment(e) {
        e.preventDefault();
        setPaymentError("");
        setPaymentSuccess(null);

        if (!verifiedRecipient) {
            setPaymentError("Please enter and verify a registered recipient's mobile number first.");
            return;
        }

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            setPaymentError("Please enter a valid amount greater than ₹0.00.");
            return;
        }

        if (cards.length === 0) {
            setPaymentError("You do not have any cards in your vault. Please add a vault card with balance first.");
            return;
        }

        if (!activePayingCard || Number(activePayingCard.balance) < numAmount) {
            setPaymentError(`Insufficient funds on card "${activePayingCard?.card_name || 'Vault'}". Available: ${formatINR(activePayingCard?.balance || 0)}.`);
            return;
        }

        // Check if user has set a Security PIN
        if (!user?.has_pin) {
            setChangePinError("");
            setNewPin("");
            setConfirmNewPin("");
            setShowSetPinModal(true);
            return;
        }

        // Open PIN confirmation dialog
        setEnteredPin("");
        setPinError("");
        setShowPinModal(true);
    }

    // Step 2: Authorize payment with 4-digit PIN
    async function handleConfirmPaymentWithPin(e) {
        e.preventDefault();
        setPinError("");

        const cleanPin = String(enteredPin).replace(/\D/g, "");
        if (cleanPin.length !== 4) {
            setPinError("Please enter your 4-digit Security PIN.");
            return;
        }

        setPaying(true);

        try {
            const res = await API.post("/payments/transfer", {
                recipient_phone: verifiedRecipient.phone,
                amount: Number(amount),
                notes: notes.trim(),
                card_id: activePayingCard.id,
                pin: cleanPin
            });

            // Payment succeeded!
            setShowPinModal(false);
            setEnteredPin("");
            setPaymentSuccess(res.data);
            setAmount("");
            setNotes("");
            setRecipientPhone("");
            setVerifiedRecipient(null);

            // Reload cards and history to reflect updated balance
            await loadPaymentData();
        } catch (err) {
            const msg = err.response?.data?.message || "Payment transfer failed. Please try again.";
            setPinError(msg);
            setEnteredPin("");
        } finally {
            setPaying(false);
        }
    }

    // Set or Change Security PIN
    async function handleSavePin(e) {
        e.preventDefault();
        setChangePinError("");

        const cleanNew = String(newPin).replace(/\D/g, "");
        const cleanConfirm = String(confirmNewPin).replace(/\D/g, "");

        if (cleanNew.length !== 4) {
            setChangePinError("PIN must be exactly 4 digits.");
            return;
        }

        if (cleanNew !== cleanConfirm) {
            setChangePinError("PINs do not match. Please verify.");
            return;
        }

        setSettingPin(true);
        try {
            await API.post("/auth/set-pin", { pin: cleanNew });
            if (updateUser) {
                updateUser({ has_pin: true });
            }
            setShowSetPinModal(false);
            setNewPin("");
            setConfirmNewPin("");

            // If user was in middle of paying, prompt for PIN to complete
            if (verifiedRecipient && amount) {
                setEnteredPin("");
                setPinError("");
                setShowPinModal(true);
            }
        } catch (err) {
            setChangePinError(err.response?.data?.message || "Could not set PIN. Please try again.");
        } finally {
            setSettingPin(false);
        }
    }

    if (loadingData) {
        return (
            <div className="page-container text-center py-5">
                <div className="spinner-border text-primary mb-3"></div>
                <h5 className="fw-bold">Loading Payments Hub...</h5>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="page-title mb-1">Instant Payments</h2>
                    <p className="text-muted small mb-0">
                        Pay any registered user instantly using their 10-digit mobile number.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2"
                    onClick={() => {
                        setChangePinError("");
                        setNewPin("");
                        setConfirmNewPin("");
                        setShowSetPinModal(true);
                    }}
                >
                    <i className="bi bi-shield-lock-fill text-primary"></i>
                    <span>{user?.has_pin ? "Change Security PIN" : "Set Security PIN"}</span>
                </button>
            </div>

            {/* Success Receipt Banner */}
            {paymentSuccess && (
                <div className="alert alert-success border-0 shadow-sm p-4 rounded-4 mb-4 position-relative">
                    <div className="d-flex align-items-start gap-3">
                        <div className="rounded-circle bg-success text-white p-3 d-flex align-items-center justify-content-center" style={{ width: "48px", height: "48px", fontSize: "1.3rem" }}>
                            <i className="bi bi-check-lg"></i>
                        </div>
                        <div className="flex-grow-1">
                            <h5 className="fw-bold text-success mb-1">Payment Successful!</h5>
                            <p className="mb-2 text-dark">
                                You transferred <strong>{formatINR(paymentSuccess.amount)}</strong> to{" "}
                                <strong>{paymentSuccess.recipient.name}</strong> (+91 {paymentSuccess.recipient.phone}).
                            </p>
                            <div className="d-flex flex-wrap gap-3 small text-muted">
                                <span><strong>UTR / Ref No:</strong> <code>{paymentSuccess.utr}</code></span>
                                <span><strong>Status:</strong> Immediate Settlement</span>
                                <span><strong>Recipient Balance:</strong> Updated Dynamically</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setPaymentSuccess(null)}
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
            )}

            <div className="row g-4 align-items-start">
                {/* Column 1: Pay to Anyone Form */}
                <div className="col-12 col-xl-7 col-lg-7">
                    <div className="official-card p-4">
                        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                            <div className="sidebar-brand-mark" style={{ width: "38px", height: "38px", fontSize: "1.1rem" }}>
                                <i className="bi bi-send-fill"></i>
                            </div>
                            <div>
                                <h4 className="fw-bold mb-0" style={{ fontSize: "1.15rem" }}>Pay to Anyone</h4>
                                <small className="text-muted">Instant account-to-account transfer by mobile number</small>
                            </div>
                        </div>

                        {paymentError && (
                            <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                                <i className="bi bi-exclamation-octagon-fill text-danger fs-5"></i>
                                <span>{paymentError}</span>
                            </div>
                        )}

                        <form onSubmit={handleInitiatePayment}>
                            {/* Step 1: Recipient Mobile Number */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted mb-1">
                                    Recipient 10-Digit Mobile Number
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light fw-bold text-muted border-end-0">
                                        +91
                                    </span>
                                    <input
                                        type="tel"
                                        className="form-control-official border-start-0"
                                        placeholder="e.g. 9876543210"
                                        value={recipientPhone}
                                        onChange={handlePhoneChange}
                                        maxLength={10}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary px-3"
                                        onClick={() => handleLookupRecipient()}
                                        disabled={lookingUp || recipientPhone.length < 10}
                                    >
                                        {lookingUp ? (
                                            <span className="spinner-border spinner-border-sm"></span>
                                        ) : (
                                            <>
                                                <i className="bi bi-search me-1"></i> Verify
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Verification Status Box */}
                                {lookingUp && (
                                    <div className="small text-muted mt-2 d-flex align-items-center gap-2">
                                        <span className="spinner-border spinner-border-sm text-primary"></span>
                                        <span>Verifying recipient account across registered users...</span>
                                    </div>
                                )}

                                {verifiedRecipient && (
                                    <div className="p-3 mt-2 rounded-3 bg-success-subtle border border-success-subtle d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-success text-white p-2 d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px", fontSize: "0.85rem" }}>
                                                <i className="bi bi-person-check-fill"></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold text-success" style={{ fontSize: "0.92rem" }}>
                                                    {verifiedRecipient.name}
                                                </div>
                                                <div className="small text-muted">
                                                    Registered FinTrack Account (+91 {verifiedRecipient.phone})
                                                </div>
                                            </div>
                                        </div>
                                        <span className="badge bg-success text-white px-2 py-1 rounded-pill small">
                                            <i className="bi bi-check-circle-fill me-1"></i> Verified
                                        </span>
                                    </div>
                                )}

                                {lookupError && (
                                    <div className="small text-danger mt-2 d-flex align-items-center gap-1">
                                        <i className="bi bi-x-circle-fill"></i>
                                        <span>{lookupError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Amount in INR */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted mb-1">
                                    Amount to Transfer (₹)
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light fw-bold text-muted border-end-0">₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        className="form-control-official border-start-0"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Step 3: Paying Card Vault Selector */}
                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label small fw-bold text-muted mb-0">
                                        Pay From Vault Card
                                    </label>
                                    <span className="small text-muted">
                                        Total Balance: <strong className="text-dark">{formatINR(totalBalance)}</strong>
                                    </span>
                                </div>

                                {cards.length > 0 ? (
                                    <select
                                        className="form-select-official w-100"
                                        value={selectedCardId}
                                        onChange={(e) => setSelectedCardId(e.target.value)}
                                        required
                                    >
                                        {cards.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.card_name} ({c.card_number}) — Available: {formatINR(c.balance)}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="alert alert-warning small py-2 px-3 rounded-3 mb-0">
                                        No vault cards found. Please add a card in your Dashboard vault to send money.
                                    </div>
                                )}
                            </div>

                            {/* Step 4: Remarks / Note */}
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted mb-1">
                                    Purpose / Note (Optional)
                                </label>
                                <input
                                    type="text"
                                    className="form-control-official w-100"
                                    placeholder="e.g. Dinner share, Rent split, Project work"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            {/* Pay Button */}
                            <button
                                type="submit"
                                className="btn btn-primary w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                                style={{ borderRadius: "14px", fontWeight: 700, fontSize: "1rem", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.28)" }}
                                disabled={!verifiedRecipient || !amount}
                            >
                                <i className="bi bi-shield-lock-fill"></i>
                                <span>
                                    Pay {amount ? formatINR(amount) : ""} {verifiedRecipient ? `to ${verifiedRecipient.name}` : "Securely"}
                                </span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Column 2: Account Snapshot & Quick Information */}
                <div className="col-12 col-xl-5 col-lg-5">
                    {/* User's Sending Vault Card Preview */}
                    <div className="official-card p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="badge bg-light text-muted fw-bold px-2 py-1 rounded-pill">
                                ACTIVE SOURCE VAULT
                            </span>
                            <span className="small text-muted">
                                Logged in as: <strong>{user?.name}</strong>
                            </span>
                        </div>

                        {activePayingCard ? (
                            <div className="p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="fw-bold text-dark">{activePayingCard.card_name}</div>
                                    <div className="small text-muted font-monospace">{activePayingCard.card_number}</div>
                                </div>
                                <div className="text-end">
                                    <div className="small text-muted">Available</div>
                                    <div className="fw-bold text-primary" style={{ fontSize: "1.1rem" }}>
                                        {formatINR(activePayingCard.balance)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted small">No card selected</div>
                        )}

                        <div className="mt-3 pt-3 border-top small text-muted">
                            <div className="d-flex justify-content-between py-1">
                                <span>Your Registered Mobile:</span>
                                <strong>+91 {user?.phone || "Not Set"}</strong>
                            </div>
                            <div className="d-flex justify-content-between py-1">
                                <span>Security PIN:</span>
                                <strong className={user?.has_pin ? "text-success" : "text-warning"}>
                                    {user?.has_pin ? "Active (4-Digit PIN)" : "Not Set"}
                                </strong>
                            </div>
                            <div className="d-flex justify-content-between py-1">
                                <span>Transfer Fee:</span>
                                <strong className="text-success">₹0.00 (Free UPI)</strong>
                            </div>
                            <div className="d-flex justify-content-between py-1">
                                <span>Settlement Time:</span>
                                <strong className="text-primary">Instant Real-time</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Transfer Records */}
            <div className="official-card p-4 mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                    <div>
                        <h4 className="fw-bold mb-0" style={{ fontSize: "1.1rem" }}>P2P Transfer Activity</h4>
                        <small className="text-muted">Live incoming and outgoing mobile payment transactions</small>
                    </div>
                    <span className="badge bg-light text-muted px-3 py-2 rounded-pill">
                        {history.length} Transfers Recorded
                    </span>
                </div>

                {history.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table align-middle mb-0" style={{ fontSize: "0.88rem" }}>
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Transaction Particulars</th>
                                    <th>Ref. / UTR No.</th>
                                    <th>Type</th>
                                    <th className="text-end">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((tx) => {
                                    const isExpense = tx.type === "Expense";
                                    return (
                                        <tr key={tx.id}>
                                            <td className="text-muted text-nowrap">
                                                {new Date(tx.transaction_date).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{tx.title}</div>
                                                <div className="small text-muted">{tx.description}</div>
                                            </td>
                                            <td>
                                                <code className="text-secondary small">{tx.ref_no}</code>
                                            </td>
                                            <td>
                                                <span className={`badge ${isExpense ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"} px-2 py-1 rounded-pill`}>
                                                    {isExpense ? "Sent (Debit)" : "Received (Credit)"}
                                                </span>
                                            </td>
                                            <td className={`text-end fw-bold ${isExpense ? "text-danger" : "text-success"}`}>
                                                {isExpense ? `- ${formatINR(tx.amount)}` : `+ ${formatINR(tx.amount)}`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-5 text-muted">
                        <i className="bi bi-arrow-left-right fs-1 opacity-25 d-block mb-2"></i>
                        <p className="fw-semibold mb-0">No mobile transfers recorded yet.</p>
                        <small>Payments made to or received from other users will show here with UTR details.</small>
                    </div>
                )}
            </div>

            {/* Modal 1: 4-Digit Security PIN Authorize Modal */}
            {showPinModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        backdropFilter: "blur(4px)",
                        zIndex: 1055
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "420px" }}>
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <div
                                        className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                                        style={{ width: "36px", height: "36px" }}
                                    >
                                        <i className="bi bi-shield-lock-fill fs-5"></i>
                                    </div>
                                    <h5 className="modal-title fw-bold mb-0" style={{ fontSize: "1.1rem" }}>
                                        Authorize Payment
                                    </h5>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => {
                                        setShowPinModal(false);
                                        setEnteredPin("");
                                        setPinError("");
                                    }}
                                    disabled={paying}
                                ></button>
                            </div>

                            <div className="modal-body px-4 pt-3 pb-4">
                                {/* Payment Summary */}
                                <div className="p-3 rounded-3 bg-light border text-center mb-3">
                                    <small className="text-muted d-block mb-1">Paying To</small>
                                    <h6 className="fw-bold mb-0 text-dark">{verifiedRecipient?.name}</h6>
                                    <small className="text-muted font-monospace">+91 {verifiedRecipient?.phone}</small>
                                    <div className="mt-2 pt-2 border-top">
                                        <span className="fs-3 fw-bold text-primary">{formatINR(amount)}</span>
                                        <div className="small text-muted mt-1">
                                            From: {activePayingCard?.card_name} ({activePayingCard?.card_number})
                                        </div>
                                    </div>
                                </div>

                                {/* Pin Error Display (e.g. Incorrect PIN) */}
                                {pinError && (
                                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-start gap-2">
                                        <i className="bi bi-exclamation-octagon-fill text-danger flex-shrink-0 mt-1 fs-6"></i>
                                        <div>
                                            <span className="fw-bold d-block">Payment Declined</span>
                                            <span>{pinError}</span>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleConfirmPaymentWithPin}>
                                    <div className="mb-3 text-center">
                                        <label className="form-label small fw-bold text-muted mb-2">
                                            Enter 4-Digit Security PIN
                                        </label>
                                        <div className="d-flex justify-content-center">
                                            <input
                                                type={showEnteredPin ? "text" : "password"}
                                                inputMode="numeric"
                                                pattern="[0-9]{4}"
                                                maxLength={4}
                                                autoFocus
                                                className="form-control text-center fw-bold fs-4 tracking-widest"
                                                style={{
                                                    maxWidth: "200px",
                                                    letterSpacing: "0.5em",
                                                    borderRadius: "12px",
                                                    borderColor: pinError ? "#dc3545" : undefined
                                                }}
                                                placeholder="••••"
                                                value={enteredPin}
                                                onChange={(e) => {
                                                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                    setEnteredPin(v);
                                                    if (pinError) setPinError("");
                                                }}
                                                disabled={paying}
                                            />
                                        </div>
                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm text-decoration-none text-muted py-0"
                                                onClick={() => setShowEnteredPin(!showEnteredPin)}
                                            >
                                                <i className={`bi ${showEnteredPin ? "bi-eye-slash" : "bi-eye"} me-1`}></i>
                                                {showEnteredPin ? "Hide PIN" : "Show PIN"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-2 mt-4">
                                        <button
                                            type="button"
                                            className="btn btn-light w-50 py-2 rounded-3 fw-semibold"
                                            onClick={() => {
                                                setShowPinModal(false);
                                                setEnteredPin("");
                                                setPinError("");
                                            }}
                                            disabled={paying}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary w-50 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                                            disabled={paying || enteredPin.length !== 4}
                                        >
                                            {paying ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm"></span>
                                                    <span>Authorizing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-lock-fill"></i>
                                                    <span>Confirm & Pay</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Set or Change 4-Digit Security PIN */}
            {showSetPinModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{
                        backgroundColor: "rgba(15, 23, 42, 0.6)",
                        backdropFilter: "blur(4px)",
                        zIndex: 1055
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "420px" }}>
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <div
                                        className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
                                        style={{ width: "36px", height: "36px" }}
                                    >
                                        <i className="bi bi-key-fill fs-5"></i>
                                    </div>
                                    <h5 className="modal-title fw-bold mb-0" style={{ fontSize: "1.1rem" }}>
                                        {user?.has_pin ? "Change Security PIN" : "Set 4-Digit Security PIN"}
                                    </h5>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => {
                                        setShowSetPinModal(false);
                                        setNewPin("");
                                        setConfirmNewPin("");
                                        setChangePinError("");
                                    }}
                                    disabled={settingPin}
                                ></button>
                            </div>

                            <div className="modal-body px-4 pt-3 pb-4">
                                <p className="text-muted small mb-3">
                                    Set a secret 4-digit PIN to securely authorize instant fund transfers from your vault cards.
                                </p>

                                {changePinError && (
                                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3 d-flex align-items-center gap-2">
                                        <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                                        <span>{changePinError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSavePin}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted mb-1">
                                            Enter New 4-Digit PIN
                                        </label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            pattern="[0-9]{4}"
                                            maxLength={4}
                                            required
                                            className="form-control text-center fw-bold fs-5"
                                            style={{ letterSpacing: "0.4em" }}
                                            placeholder="••••"
                                            value={newPin}
                                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label small fw-bold text-muted mb-1">
                                            Confirm 4-Digit PIN
                                        </label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            pattern="[0-9]{4}"
                                            maxLength={4}
                                            required
                                            className="form-control text-center fw-bold fs-5"
                                            style={{ letterSpacing: "0.4em" }}
                                            placeholder="••••"
                                            value={confirmNewPin}
                                            onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                        />
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-light w-50 py-2 rounded-3 fw-semibold"
                                            onClick={() => {
                                                setShowSetPinModal(false);
                                                setNewPin("");
                                                setConfirmNewPin("");
                                                setChangePinError("");
                                            }}
                                            disabled={settingPin}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary w-50 py-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                                            disabled={settingPin || newPin.length !== 4 || confirmNewPin.length !== 4}
                                        >
                                            {settingPin ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm"></span>
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-shield-check"></i>
                                                    <span>Save PIN</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Payments;
