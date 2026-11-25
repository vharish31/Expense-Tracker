function EmptyState({ icon, title, description, action, actionText }) {
    return (
        <div className="text-center py-5">
            <i className={`bi ${icon} fs-1 d-block mb-3 text-muted`}></i>
            <h5 className="text-muted mb-2">{title}</h5>
            <p className="text-muted mb-4">{description}</p>
            {action && (
                <button className="btn btn-primary" onClick={action}>
                    {actionText}
                </button>
            )}
        </div>
    );
}

export default EmptyState;
