import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const CategoryTransactionsModal = ({ isOpen, onClose, category, transactions, categories, onEditTransaction }) => {
    if (!isOpen || !category) return null;

    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                            {category.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{category.name}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                Tổng: <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalAmount)}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Transaction List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {transactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            Không có giao dịch nào.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transactions.map(txn => {
                                const isIncome = txn.type === 'income';
                                return (
                                    <div 
                                        key={txn.id} 
                                        className="px-4 py-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer rounded-2xl" 
                                        onClick={() => onEditTransaction(txn)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-bold text-slate-800 dark:text-white truncate">{txn.description}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{new Date(txn.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <span className={`text-base font-bold ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryTransactionsModal;
