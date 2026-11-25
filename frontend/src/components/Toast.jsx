import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "info") => {
        const id = Date.now() + Math.random().toString(36).substring(2, 9);
        const newToast = { id, message, type };

        setToasts((prev) => [...prev, newToast]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div
                className="toast-container position-fixed top-0 end-0 p-3"
                style={{ zIndex: 9999, maxWidth: "380px", width: "100%" }}
            >
                {toasts.map((toast) => {
                    const isSuccess = toast.type === "success";
                    const isError = toast.type === "error";
                    const isWarning = toast.type === "warning";

                    return (
                        <div
                            key={toast.id}
                            className={`toast show border-0 shadow-lg rounded-4 mb-2 overflow-hidden animate-fade-in ${
                                isSuccess
                                    ? "bg-success text-white"
                                    : isError
                                    ? "bg-danger text-white"
                                    : isWarning
                                    ? "bg-warning text-dark"
                                    : "bg-dark text-white"
                            }`}
                            role="alert"
                            aria-live="assertive"
                            aria-atomic="true"
                        >
                            <div className="d-flex align-items-center p-3">
                                <div className="me-2 fs-5">
                                    {isSuccess && <i className="bi bi-check-circle-fill"></i>}
                                    {isError && <i className="bi bi-exclamation-octagon-fill"></i>}
                                    {isWarning && <i className="bi bi-exclamation-triangle-fill"></i>}
                                    {!isSuccess && !isError && !isWarning && <i className="bi bi-info-circle-fill"></i>}
                                </div>
                                <div className="flex-grow-1 small fw-semibold" style={{ lineHeight: 1.4 }}>
                                    {toast.message}
                                </div>
                                <button
                                    type="button"
                                    className={`btn-close ms-2 ${!isWarning ? "btn-close-white" : ""}`}
                                    onClick={() => removeToast(toast.id)}
                                    aria-label="Close"
                                ></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            showToast: (msg) => console.log(msg)
        };
    }
    return context;
}
