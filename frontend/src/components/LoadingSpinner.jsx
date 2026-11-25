function LoadingSpinner({ size = "md" }) {
    const sizeClasses = {
        sm: "spinner-border-sm",
        md: "",
        lg: "spinner-border-lg"
    };

    return (
        <div className="d-flex justify-content-center align-items-center py-5">
            <div className={`spinner-border text-primary ${sizeClasses[size]}`} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );
}

export default LoadingSpinner;
