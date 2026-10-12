import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, TrendingUp, ArrowUpRight, Sparkles } from 'lucide-react';
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

    // Group transactions by category and subcategory for the progress bars
    const categoryBreakdown = useMemo(() => {
        const map = {};

        transactions.forEach(txn => {
            let parentCat = null;
            let subCat = null;

            if (txn.subcategoryId) {
                for (const c of categories) {
                    if (c.subcategories && c.subcategories.some(s => s.id === txn.subcategoryId)) {
                        subCat = c.subcategories.find(s => s.id === txn.subcategoryId);
                        parentCat = c;
                        break;
                    }
                }
            }

            if (!parentCat) {
                parentCat = categories.find(c => c.id === txn.categoryId);
            }

            const parentId = parentCat ? parentCat.id : 'other';
            const parentName = parentCat ? parentCat.name : 'Khác';
            const parentIcon = parentCat ? parentCat.icon : '💵';

            if (!map[parentId]) {
                map[parentId] = {
                    id: parentId,
                    name: parentName,
                    icon: parentIcon,
                    amount: 0,
                    count: 0,
                    subItems: {}
                };
            }

            const amount = Number(txn.amount) || 0;
            map[parentId].amount += amount;
            map[parentId].count += 1;

            if (subCat) {
                if (!map[parentId].subItems[subCat.id]) {
                    map[parentId].subItems[subCat.id] = {
                        id: subCat.id,
                        name: subCat.name,
                        icon: subCat.icon || parentIcon,
                        amount: 0,
                        count: 0,
                        isSub: true
                    };
                }
                map[parentId].subItems[subCat.id].amount += amount;
                map[parentId].subItems[subCat.id].count += 1;
            } else {
                if (!map[parentId].subItems['main']) {
                    map[parentId].subItems['main'] = {
                        id: 'main',
                        name: 'Khoản thu chung',
                        icon: parentIcon,
                        amount: 0,
                        count: 0,
                        isSub: false
                    };
                }
                map[parentId].subItems['main'].amount += amount;
                map[parentId].subItems['main'].count += 1;
            }
        });

        return Object.values(map)
            .map(parent => {
                const subList = Object.values(parent.subItems);
                const hasOnlyGenericMain = subList.length === 1 && !subList[0].isSub;
                return {
                    ...parent,
                    subList: hasOnlyGenericMain ? [] : subList.sort((a, b) => b.amount - a.amount)
                };
            })
            .sort((a, b) => b.amount - a.amount);
    }, [transactions, categories]);

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

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4">
                    {/* 1. Các thanh progress bar thống kê theo nguồn thu ở trên cùng */}
                    {categoryBreakdown.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60 space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
                                    Thống kê theo nguồn thu ({categoryBreakdown.length})
                                </h3>
                                <span className="text-xs font-medium text-slate-400">
                                    {totalIncome > 0 ? 'Tỷ trọng %' : ''}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {categoryBreakdown.map((cat) => {
                                    const percent = totalIncome > 0 ? ((cat.amount / totalIncome) * 100) : 0;
                                    const formattedPercent = percent.toFixed(1);

                                    return (
                                        <div key={cat.id} className="space-y-1.5 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-base select-none">{cat.icon}</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {cat.name}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        ({cat.count} giao dịch)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(cat.amount)}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded min-w-[45px] text-right">
                                                        {formattedPercent}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>

                                            {/* Subcategories list */}
                                            {cat.subList && cat.subList.length > 0 && (
                                                <div className="pl-4 pt-1 space-y-1.5 border-l-2 border-emerald-200 dark:border-emerald-800/60 ml-2 mt-2">
                                                    {cat.subList.map((sub) => {
                                                        const subPercent = totalIncome > 0 ? ((sub.amount / totalIncome) * 100).toFixed(1) : 0;
                                                        return (
                                                            <div key={sub.id} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                                                <span className="truncate pr-2">• {sub.name}</span>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                        {formatCurrency(sub.amount)}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        ({subPercent}%)
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 2. Danh sách các khoản thu gọn gàng (không chứa thông tin ví và danh mục) */}
                    <div className="space-y-2">
                        <div className="px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Danh sách giao dịch ({transactions.length})
                            </h3>
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

                                            {/* Transaction Details - Chỉ hiển thị tên và ngày/giờ */}
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
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BaseIncomeModal;
