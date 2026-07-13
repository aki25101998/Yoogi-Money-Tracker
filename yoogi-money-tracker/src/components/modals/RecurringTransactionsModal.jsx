import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, CalendarClock, Trash2 } from 'lucide-react';
import AddRecurringTransactionModal from './AddRecurringTransactionModal';
import { deleteRecurringTransaction } from '../../utils/supabaseHelpers';
import { formatCurrency } from '../../utils/formatters';

const RecurringTransactionsModal = ({ isOpen, onClose, categories, user, wallets, recurringTransactions = [] }) => {
    const [isAddOpen, setIsAddOpen] = useState(false);

    if (!isOpen) return null;

    const handleDelete = async (id) => {
        if (!user) return;
        if (window.confirm("Bạn có chắc chắn muốn xóa giao dịch định kỳ này?")) {
            try {
                await deleteRecurringTransaction(user.uid, id);
            } catch (error) {
                alert("Lỗi khi xóa: " + error.message);
            }
        }
    };

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 flex justify-between items-start border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <h3 className="font-bold text-2xl text-slate-800 dark:text-white leading-tight">
                                Giao dịch định kỳ
                            </h3>
                            <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                            {recurringTransactions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-32 h-32 mb-6 bg-orange-100/50 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                                        <div className="relative">
                                            <div className="w-16 h-12 bg-amber-200 dark:bg-amber-700 rounded-lg absolute bottom-0 left-1/2 -translate-x-1/2 rounded-b-xl"></div>
                                            <div className="w-12 h-14 bg-white dark:bg-slate-700 rounded shadow-sm border border-slate-200 dark:border-slate-600 absolute bottom-4 left-1/2 -translate-x-1/2 -rotate-6"></div>
                                            <CalendarClock className="w-8 h-8 text-slate-400 absolute bottom-6 left-1/2 -translate-x-1/2 -rotate-6" />
                                        </div>
                                    </div>
                                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2 max-w-[250px]">
                                        Chưa có giao dịch định kỳ nào được lên lịch.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recurringTransactions.map(rt => {
                                        const category = categories?.find(c => c.id === rt.categoryId);
                                        const wallet = wallets?.find(w => w.id === rt.walletId);
                                        return (
                                            <div key={rt.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg">
                                                        {category?.icon || (rt.type === 'transfer' ? '💸' : '❓')}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{rt.description}</h4>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <CalendarClock className="w-3 h-3" />
                                                            Mỗi {rt.intervalValue} {rt.intervalUnit} • Tiếp theo: {new Date(rt.nextDate).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <span className={`font-bold block ${rt.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {rt.type === 'income' ? '+' : '-'}{formatCurrency(rt.amount)}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">{wallet?.name || 'Ví'}</span>
                                                    </div>
                                                    <button onClick={() => handleDelete(rt.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                            <button 
                                onClick={() => setIsAddOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-slate-700/30"
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
                user={user}
                wallets={wallets}
            />
        </>
    );
};

export default RecurringTransactionsModal;
