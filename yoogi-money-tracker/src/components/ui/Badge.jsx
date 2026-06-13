import React from 'react';

const Badge = ({ children, type = "default" }) => {
    const styles = {
        default: "bg-slate-100 text-slate-600",
        success: "bg-green-100 text-green-700",
        warning: "bg-amber-100 text-amber-700",
        danger: "bg-rose-100 text-rose-700",
        purple: "bg-indigo-100 text-indigo-700",
        blue: "bg-blue-100 text-blue-700",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] || styles.default}`}>
            {children}
        </span>
    );
};

export default Badge;
