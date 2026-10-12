import React from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, TrendingUp, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const BaseIncomeModal = ({
    isOpen,
    onClose,
    totalIncome,
    transactions = [],
    categories = [],
    onEditTransaction,
    onDeleteTransaction
}) => {
    if (!isOpen) return null;

    const getCategoryDisplay = (txn) => {
        let parentCat = categories.find(c => c.id === txn.categoryId);

        if (txn.subcategoryId) {
            for (const c of categories) {
                if (c.subcategories && c.subcategories.some(s => s.id === txn.subcategoryId)) {
                    if (!parentCat) parentCat = c;
                    break;
                }
            }
        }

        return {
            icon: parentCat?.icon || '💵',
            name: parentCat?.name || 'Thu nhập'
        };
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner border border-emerald-200/50 dark:border-emerald-800/40">
                            <TrendingUp className="w-6 h-6 pointer-events-none" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Thu Nhập Cơ Sở</h2>
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                                    {transactions.length} khoản thu
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                Tổng cộng: <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <X className="w-6 h-6 pointer-events-none" />
                    </button>
                </div>

                {/* Body - Transaction List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Danh sách các khoản thu ({transactions.length})
                        </h3>
                        <span className="text-[11px] text-slate-400 italic">
                            Nhấp vào giao dịch để sửa
                        </span>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 opacity-60" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Chưa có giao dịch thu nhập nào trong kỳ
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                Chỉ các giao dịch thu nhập thuộc danh mục được chọn trong Cài đặt Ngân quỹ mới được tính vào đây.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            {transactions.map(txn => {
                                const catInfo = getCategoryDisplay(txn);
                                const formattedDate = txn.date ? new Date(txn.date).toLocaleDateString('vi-VN') : '';

                                return (
                                    <div
                                        key={txn.id}
                                        onClick={() => onEditTransaction && onEditTransaction(txn)}
                                        className="p-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                                    >
                                        {/* Category Icon */}
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-lg shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                            {catInfo.icon}
                                        </div>

                                        {/* Transaction Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                {txn.description || catInfo.name}
                                            </p>
                                            {formattedDate && (
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                    {formattedDate}{txn.time ? ` • ${txn.time}` : ''}
                                                </p>
                                            )}
                                        </div>

                                        {/* Amount & Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                <ArrowUpRight className="w-3.5 h-3.5 pointer-events-none" />
                                                +{formatCurrency(txn.amount)}
                                            </span>

                                            {onDeleteTransaction && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteTransaction(txn.id);
                                                    }}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
                                                    title="Xóa giao dịch"
                                                >
                                                    <Trash2 className="w-4 h-4 pointer-events-none" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Notice */}
                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>💡 Nguồn thu nhập cơ sở dùng để tính hạn mức ngân quỹ.</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BaseIncomeModal;
