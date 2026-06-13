import React from 'react';
import { Loader2 } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    icon: Icon,
    iconColorClass = "text-indigo-600",
    iconBgClass = "bg-indigo-100",
    confirmLabel = "Đồng ý",
    cancelLabel = "Hủy",
    confirmVariant = "primary", // 'primary' | 'danger'
    isLoading = false,
    loadingText = "Đang xử lý..."
}) => {
    if (!isOpen) return null;

    const btnClasses = {
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
        danger: "bg-rose-600 hover:bg-rose-700 text-white"
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                {Icon && (
                    <div className={`w-12 h-12 ${iconBgClass} dark:bg-opacity-20 ${iconColorClass} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="w-6 h-6" />
                    </div>
                )}
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
                <div className="text-slate-500 dark:text-slate-400 text-sm mb-6">{description}</div>

                {isLoading ? (
                    <div className={`flex items-center justify-center gap-2 ${iconColorClass} font-medium py-2`}>
                        <Loader2 className="w-5 h-5 animate-spin" /> {loadingText}
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2 rounded-xl font-medium shadow-lg shadow-indigo-200 dark:shadow-none ${btnClasses[confirmVariant] || btnClasses.primary}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfirmModal;
