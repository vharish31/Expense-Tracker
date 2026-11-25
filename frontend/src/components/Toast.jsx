import { useEffect, useState } from "react";

function Toast({ message, type = "success", onClose }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300);
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === "success" ? "bg-success" : type === "error" ? "bg-danger" : "bg-info";

    return (
        <div
            className={`toast show position-fixed top-0 end-0 m-3 ${bgColor} text-white`}
            style={{ zIndex: 9999, opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}
        >
            <div className="toast-body d-flex align-items-center gap-2">
                <i className={`bi ${type === "success" ? "bi-check-circle" : type === "error" ? "bi-exclamation-circle" : "bi-info-circle"}`}></i>
                {message}
            </div>
        </div>
    );
}

export default Toast;
