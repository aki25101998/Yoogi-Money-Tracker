import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Format Vietnamese date title (e.g. "Thứ Sáu, 14/11/2026").
 */
export const formatDayTitle = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month - 1, day);
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayOfWeek = days[dateObj.getDay()] || '';
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${dayOfWeek}, ${dd}/${mm}/${year}`;
};

/**
 * Helper to resolve category name and icon from categories list.
 */
export const getCategoryInfo = (txn, categories = []) => {
    if (!txn) return { name: 'Chi tiêu', icon: '💸' };
    const catId = txn.categoryId || txn.category_id;
    const subId = txn.subcategoryId || txn.subcategory_id;

    let fullCat = categories.find(c => c.id === catId);
    let subCat = null;

    if (fullCat?.subcategories && subId) {
        subCat = fullCat.subcategories.find(s => s.id === subId);
    }

    if (!subCat && subId) {
        for (const c of categories) {
            const found = c.subcategories?.find(s => s.id === subId);
            if (found) {
                subCat = found;
                if (!fullCat) fullCat = c;
                break;
            }
        }
    }

    const name = subCat?.name || fullCat?.name || txn.categoryName || txn.category || 'Chi tiêu';
    const icon = subCat?.icon || fullCat?.icon || '💸';

    return { name, icon };
};

/**
 * Helper to resolve wallet name.
 */
export const getWalletName = (txn, wallets = []) => {
    if (!txn) return '';
    const walletId = txn.walletId || txn.wallet_id;
    const wallet = wallets.find(w => w.id === walletId);
    return wallet?.name || txn.walletName || '';
};

const DayDetailsModal = ({
    isOpen,
    onClose,
    dayData,
    dailyLimit = 150000,
    categories = [],
    wallets = [],
    onQuickAddTransaction,
    onEditTransaction,
    onDeleteTransaction
}) => {
    const [isOtherExpanded, setIsOtherExpanded] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !dayData) return null;

    const {
        dateStr = '',
        spent = 0,
        overAmount = 0,
        status = 'future',
        trackedTransactions = [],
        otherTransactions = []
    } = dayData;

    const formattedTitle = formatDayTitle(dateStr);
    const otherTotal = (otherTransactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const renderStatusBadge = () => {
        switch (status) {
            case 'pass':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="pointer-events-none font-bold">✓</span>
                        <span>Đạt mục tiêu ({formatCurrency(spent)} / {formatCurrency(dailyLimit)})</span>
                    </div>
                );
            case 'fail':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <span className="pointer-events-none font-bold">✕</span>
                        <span>Vượt hạn mức {formatCurrency(overAmount)} ({formatCurrency(spent)} / {formatCurrency(dailyLimit)})</span>
                    </div>
                );
            case 'no_spend':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        <span className="pointer-events-none">⭐</span>
                        <span>Tuyệt vời - Không tiêu đồng nào (0 đ / {formatCurrency(dailyLimit)})</span>
                    </div>
                );
            case 'future':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <span>Ngày trong tương lai</span>
                    </div>
                );
            case 'unconfigured':
                return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <span>Chưa cấu hình danh mục</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleQuickAdd = () => {
        onQuickAddTransaction?.({
            date: dateStr,
            type: 'expense'
        });
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
                role="dialog"
                aria-modal="true"
                aria-labelledby="day-details-title"
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 shrink-0 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h3 id="day-details-title" className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                            {formattedTitle}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            aria-label="Đóng"
                        >
                            <X className="w-5 h-5 pointer-events-none" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        {renderStatusBadge()}

                        <button
                            type="button"
                            onClick={handleQuickAdd}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4 pointer-events-none" />
                            <span className="pointer-events-none">+ Thêm chi tiêu</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
                    {/* Tracked Transactions Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Chi tiêu thuộc hạn mức kỷ luật ({trackedTransactions.length} món, tổng: {formatCurrency(spent)})
                            </h4>
                        </div>

                        {trackedTransactions.length === 0 ? (
                            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                                Không có khoản chi tiêu nào thuộc danh mục kỷ luật trong ngày này.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {trackedTransactions.map((txn, index) => {
                                    const { name: catName, icon: catIcon } = getCategoryInfo(txn, categories);
                                    const walletName = getWalletName(txn, wallets);
                                    const note = txn.description || txn.notes || catName;

                                    return (
                                        <div
                                            key={txn.id || `tracked-${index}`}
                                            onClick={() => onEditTransaction?.(txn)}
                                            className={`p-3 rounded-2xl flex items-center gap-3 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 transition-all ${
                                                onEditTransaction ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-[0.99]' : ''
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                                                {catIcon}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                    {note}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                    <span>{catName}</span>
                                                    {walletName && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate">{walletName}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                                    -{formatCurrency(txn.amount)}
                                                </span>

                                                {onDeleteTransaction && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteTransaction(txn);
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

                    {/* Collapsible Section: Other Expenses */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-900/30">
                        <button
                            type="button"
                            onClick={() => setIsOtherExpanded(prev => !prev)}
                            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            aria-expanded={isOtherExpanded}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Khoản chi khác ngoài hạn mức trong ngày
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                                    {otherTransactions.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {formatCurrency(otherTotal)}
                                </span>
                                {isOtherExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400 pointer-events-none" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
                                )}
                            </div>
                        </button>

                        {isOtherExpanded && (
                            <div className="p-3 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1 pt-1">
                                    Các khoản chi này (tiền điện, tiền nhà, trả nợ...) không nằm trong danh mục kỷ luật nên không bị trừ vào hạn mức ngày.
                                </p>

                                {otherTransactions.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                                        Không có khoản chi khác ngoài hạn mức trong ngày này.
                                    </div>
                                ) : (
                                    otherTransactions.map((txn, index) => {
                                        const { name: catName, icon: catIcon } = getCategoryInfo(txn, categories);
                                        const walletName = getWalletName(txn, wallets);
                                        const note = txn.description || txn.notes || catName;

                                        return (
                                            <div
                                                key={txn.id || `other-${index}`}
                                                onClick={() => onEditTransaction?.(txn)}
                                                className={`p-2.5 rounded-xl flex items-center gap-2.5 bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700/60 ${
                                                    onEditTransaction ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.99]' : ''
                                                }`}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-base shrink-0">
                                                    {catIcon}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                        {note}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                                        <span>{catName}</span>
                                                        {walletName && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="truncate">{walletName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        -{formatCurrency(txn.amount)}
                                                    </span>

                                                    {onDeleteTransaction && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteTransaction(txn);
                                                            }}
                                                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer"
                                                            title="Xóa giao dịch"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default DayDetailsModal;
