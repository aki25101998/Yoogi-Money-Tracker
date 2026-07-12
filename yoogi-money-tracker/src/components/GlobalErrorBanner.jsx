import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

const GlobalErrorBanner = () => {
    const [errors, setErrors] = useState([]);

    useEffect(() => {
        const handleError = (event) => {
            // Ignore ResizeObserver errors as they are common and benign in some layouts
            if (event.message && event.message.includes('ResizeObserver')) return;
            // Ignore generic cross-origin Script error
            if (event.message === 'Script error.') return;
            
            const errorMsg = event.error ? event.error.message : event.message;
            const stack = event.error ? event.error.stack : '';
            setErrors(prev => [...prev, { id: Date.now() + Math.random(), msg: errorMsg, stack }]);
        };

        const handleRejection = (event) => {
            const errorMsg = event.reason ? (event.reason.message || event.reason.toString()) : 'Unhandled Promise Rejection';
            const stack = event.reason && event.reason.stack ? event.reason.stack : '';
            setErrors(prev => [...prev, { id: Date.now() + Math.random(), msg: errorMsg, stack }]);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    const dismissError = (id) => {
        setErrors(prev => prev.filter(e => e.id !== id));
    };

    const clearAll = () => setErrors([]);

    if (errors.length === 0) return null;

    return createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-2xl flex flex-col gap-0 shadow-2xl">
            <div className="bg-red-600 text-white px-4 py-3 rounded-t-xl font-bold flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Hệ thống phát hiện lỗi ({errors.length})</span>
                </div>
                <button onClick={clearAll} className="text-white hover:bg-red-700 px-3 py-1.5 rounded-lg text-sm transition-colors font-medium">
                    Đóng tất cả
                </button>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-b-xl border-x border-b border-red-600 overflow-hidden max-h-[70vh] flex flex-col">
                <div className="overflow-y-auto p-4 flex flex-col gap-3">
                    {errors.map((err, idx) => (
                        <div key={err.id} className="relative bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                            <button 
                                onClick={() => dismissError(err.id)}
                                className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <p className="font-bold text-red-700 dark:text-red-400 text-sm pr-6 mb-1">
                                {idx + 1}. {err.msg}
                            </p>
                            {err.stack && (
                                <pre className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono mt-2 bg-white dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto leading-relaxed">
                                    {err.stack}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GlobalErrorBanner;
