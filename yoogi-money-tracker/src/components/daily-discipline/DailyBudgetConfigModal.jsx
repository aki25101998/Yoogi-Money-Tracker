import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, CheckSquare, Square, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const FOOD_KEYWORDS = ['ăn', 'uống', 'cà phê', 'cafe', 'ăn vặt', 'đi chợ'];

const COMMON_LIMIT_CHIPS = [
    { label: '100k', value: 100000 },
    { label: '150k', value: 150000 },
    { label: '200k', value: 200000 },
    { label: '300k', value: 300000 }
];

const DailyBudgetConfigModal = ({
    isOpen,
    onClose,
    config,
    categories = [],
    wallets = [],
    onSaveConfig
}) => {
    const isConfigEnabled = config?.enabled !== false;
    const parsedLimit = Number(config?.daily_limit);
    const initialLimit = parsedLimit > 0 ? parsedLimit : 150000;
    const initialCatIds = Array.isArray(config?.category_ids) ? config.category_ids : [];
    const initialWalletIds = Array.isArray(config?.wallet_ids) ? config.wallet_ids : [];

    const [enabled, setEnabled] = useState(isConfigEnabled);
    const [dailyLimit, setDailyLimit] = useState(initialLimit);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialCatIds);
    const [selectedWalletIds, setSelectedWalletIds] = useState(initialWalletIds);
    const [isAllWallets, setIsAllWallets] = useState(initialWalletIds.length === 0);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedCatIds, setExpandedCatIds] = useState([]);

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

    useEffect(() => {
        if (isOpen) {
            const nextEnabled = config?.enabled !== false;
            const nextLimit = Number(config?.daily_limit) > 0 ? Number(config.daily_limit) : 150000;
            const nextCatIds = Array.isArray(config?.category_ids) ? [...config.category_ids] : [];
            const nextWalletIds = Array.isArray(config?.wallet_ids) ? [...config.wallet_ids] : [];

            setEnabled(nextEnabled);
            setDailyLimit(nextLimit);
            setSelectedCategoryIds(nextCatIds);
            setSelectedWalletIds(nextWalletIds);
            setIsAllWallets(nextWalletIds.length === 0);
            setIsSaving(false);
        }
    }, [isOpen, config]);

    if (!isOpen) return null;

    // Filter to expense categories
    const expenseCategories = (categories || []).filter(c => c.type !== 'income');

    const toggleExpandCat = (catId) => {
        setExpandedCatIds(prev => 
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const handleToggleParentCategory = (cat) => {
        const subIds = cat.subcategories?.map(s => s.id) || [];
        const allIds = [cat.id, ...subIds];
        const isAllChecked = allIds.every(id => selectedCategoryIds.includes(id));

        if (isAllChecked) {
            setSelectedCategoryIds(prev => prev.filter(id => !allIds.includes(id)));
        } else {
            setSelectedCategoryIds(prev => Array.from(new Set([...prev, ...allIds])));
        }
    };

    const handleToggleSingleCategory = (id) => {
        setSelectedCategoryIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(itemId => itemId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleAutoSuggestFood = () => {
        const matched = new Set(selectedCategoryIds);
        expenseCategories.forEach(cat => {
            const catName = (cat.name || '').toLowerCase();
            const catMatches = FOOD_KEYWORDS.some(kw => catName.includes(kw));

            if (catMatches) {
                matched.add(cat.id);
                if (Array.isArray(cat.subcategories)) {
                    cat.subcategories.forEach(sub => matched.add(sub.id));
                }
            } else if (Array.isArray(cat.subcategories)) {
                cat.subcategories.forEach(sub => {
                    const subName = (sub.name || '').toLowerCase();
                    if (FOOD_KEYWORDS.some(kw => subName.includes(kw))) {
                        matched.add(sub.id);
                        matched.add(cat.id);
                    }
                });
            }
        });
        setSelectedCategoryIds(Array.from(matched));
    };

    const handleSelectAllCategories = () => {
        const all = new Set();
        expenseCategories.forEach(cat => {
            all.add(cat.id);
            if (cat.subcategories) {
                cat.subcategories.forEach(s => all.add(s.id));
            }
        });
        setSelectedCategoryIds(Array.from(all));
    };

    const handleDeselectAllCategories = () => {
        setSelectedCategoryIds([]);
    };

    const handleToggleWallet = (walletId) => {
        setSelectedWalletIds(prev => {
            if (prev.includes(walletId)) {
                return prev.filter(id => id !== walletId);
            } else {
                return [...prev, walletId];
            }
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const finalWalletIds = isAllWallets ? [] : selectedWalletIds;
            const newConfig = {
                enabled,
                daily_limit: Number(dailyLimit) > 0 ? Number(dailyLimit) : 150000,
                category_ids: selectedCategoryIds,
                wallet_ids: finalWalletIds
            };
            await onSaveConfig?.(newConfig);
            onClose?.();
        } catch (err) {
            console.error('Lỗi khi lưu cấu hình hạn mức hàng ngày:', err);
        } finally {
            setIsSaving(false);
        }
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
                aria-labelledby="daily-budget-config-title"
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between shrink-0">
                    <h3 id="daily-budget-config-title" className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                        Cài Đặt Hạn Mức Kỷ Luật Ngày
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

                {/* Body */}
                <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
                    {/* 1. Bật/Tắt tính năng */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                        <div>
                            <label htmlFor="daily-budget-enable-toggle" className="text-sm font-bold text-slate-800 dark:text-white block cursor-pointer">
                                Bật tính năng kỷ luật ngày
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {enabled ? 'Đang theo dõi và đánh giá mục tiêu mỗi ngày' : 'Đang tạm dừng tính năng kỷ luật'}
                            </p>
                        </div>
                        <button
                            id="daily-budget-enable-toggle"
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => setEnabled(prev => !prev)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* 2. Hạn mức mỗi ngày */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="daily-limit-input" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Hạn mức mỗi ngày
                            </label>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(dailyLimit || 0)} / ngày
                            </span>
                        </div>

                        <div className="relative">
                            <input
                                id="daily-limit-input"
                                type="text"
                                inputMode="numeric"
                                value={dailyLimit ? dailyLimit.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setDailyLimit(raw ? parseInt(raw, 10) : 0);
                                }}
                                placeholder="150.000"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 pointer-events-none">
                                ₫
                            </span>
                        </div>

                        {/* Quick Chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            {COMMON_LIMIT_CHIPS.map(chip => (
                                <button
                                    key={chip.value}
                                    type="button"
                                    onClick={() => setDailyLimit(chip.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                        dailyLimit === chip.value
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="pointer-events-none">{chip.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Danh mục theo dõi */}
                    <div className="space-y-3">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Danh mục theo dõi ({selectedCategoryIds.length} đã chọn)
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAutoSuggestFood}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5 pointer-events-none" />
                                    <span className="pointer-events-none">✨ Tự động gợi ý ăn uống</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Chỉ các khoản chi thuộc danh mục được chọn mới tính vào hạn mức ngày. Tiền điện, nhà, trả nợ sẽ bị loại trừ.
                            </p>
                        </div>

                        {/* Quick select/deselect actions */}
                        <div className="flex items-center gap-2 text-xs">
                            <button
                                type="button"
                                onClick={handleSelectAllCategories}
                                className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                                <span className="pointer-events-none">Chọn tất cả</span>
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <button
                                type="button"
                                onClick={handleDeselectAllCategories}
                                className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                            >
                                <span className="pointer-events-none">Bỏ chọn tất cả</span>
                            </button>
                        </div>

                        {/* Category List */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-2">
                            {expenseCategories.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    Không có danh mục chi tiêu nào
                                </div>
                            ) : (
                                expenseCategories.map(cat => {
                                    const subIds = cat.subcategories?.map(s => s.id) || [];
                                    const allIds = [cat.id, ...subIds];
                                    const isAllChecked = allIds.every(id => selectedCategoryIds.includes(id));
                                    const isSomeChecked = !isAllChecked && allIds.some(id => selectedCategoryIds.includes(id));
                                    const isExpanded = expandedCatIds.includes(cat.id);
                                    const hasSubs = cat.subcategories && cat.subcategories.length > 0;

                                    return (
                                        <div key={cat.id} className="py-1">
                                            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors">
                                                <div
                                                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                                    onClick={() => handleToggleParentCategory(cat)}
                                                >
                                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                        {isAllChecked ? (
                                                            <CheckSquare className="w-4 h-4 pointer-events-none" />
                                                        ) : isSomeChecked ? (
                                                            <div className="w-4 h-4 border-2 border-emerald-500 rounded bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                                                <div className="w-2 h-0.5 bg-emerald-600 rounded" />
                                                            </div>
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-400 pointer-events-none" />
                                                        )}
                                                    </span>

                                                    <span className="text-base shrink-0">{cat.icon || '📁'}</span>

                                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                        {cat.name}
                                                    </span>
                                                </div>

                                                {hasSubs && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpandCat(cat.id)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                                        aria-label="Mở rộng danh mục con"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4 pointer-events-none" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 pointer-events-none" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Subcategories */}
                                            {hasSubs && isExpanded && (
                                                <div className="pl-8 pr-2 py-1 space-y-1">
                                                    {cat.subcategories.map(sub => {
                                                        const isSubChecked = selectedCategoryIds.includes(sub.id);
                                                        return (
                                                            <div
                                                                key={sub.id}
                                                                onClick={() => handleToggleSingleCategory(sub.id)}
                                                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
                                                            >
                                                                <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
                                                                    {isSubChecked ? (
                                                                        <CheckSquare className="w-3.5 h-3.5 pointer-events-none" />
                                                                    ) : (
                                                                        <Square className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                                    )}
                                                                </span>
                                                                <span className="text-sm shrink-0">{sub.icon || '•'}</span>
                                                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                                                    {sub.name}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* 4. Ví áp dụng */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Ví áp dụng
                        </label>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAllWallets(true);
                                    setSelectedWalletIds([]);
                                }}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    isAllWallets
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span className="pointer-events-none">Tất cả các ví</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAllWallets(false);
                                    if (selectedWalletIds.length === 0 && wallets?.length > 0) {
                                        setSelectedWalletIds(wallets.map(w => w.id));
                                    }
                                }}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    !isAllWallets
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span className="pointer-events-none">Chọn ví cụ thể</span>
                            </button>
                        </div>

                        {!isAllWallets && wallets && wallets.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                                {wallets.map(w => {
                                    const isChecked = selectedWalletIds.includes(w.id);
                                    return (
                                        <div
                                            key={w.id}
                                            onClick={() => handleToggleWallet(w.id)}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                                isChecked
                                                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 pointer-events-none" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-slate-400 pointer-events-none" />
                                                )}
                                            </span>
                                            <span className="truncate">{w.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <span className="pointer-events-none">Hủy</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin pointer-events-none" />}
                        <span className="pointer-events-none">Lưu cấu hình</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default DailyBudgetConfigModal;
