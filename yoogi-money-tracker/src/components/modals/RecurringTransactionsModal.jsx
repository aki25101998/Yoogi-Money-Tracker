import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, CalendarClock } from 'lucide-react';
import AddRecurringTransactionModal from './AddRecurringTransactionModal';

const RecurringTransactionsModal = ({ isOpen, onClose, categories }) => {
    const [isAddOpen, setIsAddOpen] = useState(false);

    if (!isOpen) return null;

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex justify-between items-start border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white leading-tight">
                                Giao dịch định kỳ theo lịch trình
                            </h3>
                            <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-32 h-32 mb-6 bg-orange-100/50 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                                {/* Placeholder illustration based on screenshot */}
                                <div className="relative">
                                    <div className="w-16 h-12 bg-amber-200 dark:bg-amber-700 rounded-lg absolute bottom-0 left-1/2 -translate-x-1/2 rounded-b-xl"></div>
                                    <div className="w-12 h-14 bg-white dark:bg-slate-700 rounded shadow-sm border border-slate-200 dark:border-slate-600 absolute bottom-4 left-1/2 -translate-x-1/2 -rotate-6"></div>
                                    <CalendarClock className="w-8 h-8 text-slate-400 absolute bottom-6 left-1/2 -translate-x-1/2 -rotate-6" />
                                </div>
                            </div>
                            
                            <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2 max-w-[250px]">
                                Chưa có giao dịch định kỳ nào được lên lịch.
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">
                                Bắt đầu thêm các giao dịch định kỳ của bạn ngay bây giờ!
                            </p>
                        </div>

                        <div className="p-6 flex justify-end">
                            <button 
                                onClick={() => setIsAddOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 text-white rounded-full font-medium transition-colors shadow-lg shadow-slate-700/30"
                            >
                                <Plus className="w-5 h-5" />
                                Thêm Định Kỳ
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <AddRecurringTransactionModal 
                isOpen={isAddOpen} 
                onClose={() => setIsAddOpen(false)} 
                categories={categories}
            />
        </>
    );
};

export default RecurringTransactionsModal;
