import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Plus, Trash2, PieChart, Check, ChevronDown } from 'lucide-react';
import { saveBudgetSettings, saveBudgetPortfolio, deleteBudgetPortfolio } from '../../services/budgetService';

const BudgetSettings = ({ user, budgetSettings, budgetPortfolios, categories }) => {
    // State for Budget Settings (Income Sources)
    const [incomeIds, setIncomeIds] = useState([]);
    
    // State for Portfolios
    const [portfolios, setPortfolios] = useState([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    useEffect(() => {
        if (budgetSettings) {
            setIncomeIds(budgetSettings.incomeCategoryIds || []);
        }
    }, [budgetSettings ? JSON.stringify(budgetSettings) : null]);

    useEffect(() => {
        if (budgetPortfolios) {
            // Only update local state if the actual data from server changed
            // This prevents periodic re-fetches from wiping out unsaved local changes (like new portfolios)
            setPortfolios(budgetPortfolios);
        }
    }, [budgetPortfolios ? JSON.stringify(budgetPortfolios) : null]);

    // Income Handlers
    const toggleIncomeCategory = (categoryId) => {
        setIncomeIds(prev => 
            prev.includes(categoryId) 
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    // Portfolio Handlers
    const addPortfolio = () => {
        const newPortfolio = {
            id: `temp_${Date.now()}`,
            name: 'Nhóm mới',
            percentage: 0,
            expenseCategoryIds: [],
            isNew: true
        };
        setPortfolios([...portfolios, newPortfolio]);
    };

    const updatePortfolio = (id, field, value) => {
        setPortfolios(prev => prev.map(p => 
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const toggleExpenseCategory = (portfolioId, categoryId) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id !== portfolioId) return p;
            const hasCat = p.expenseCategoryIds.includes(categoryId);
            const newExpenseIds = hasCat 
                ? p.expenseCategoryIds.filter(id => id !== categoryId)
                : [...p.expenseCategoryIds, categoryId];
            return { ...p, expenseCategoryIds: newExpenseIds };
        }));
    };

    const toggleParentGroup = (parentCat, isIncome, portfolioId = null) => {
        const allIds = [parentCat.id, ...(parentCat.subcategories?.map(s => s.id) || [])];
        
        if (isIncome) {
            const allSelected = allIds.every(id => incomeIds.includes(id));
            if (allSelected) {
                setIncomeIds(prev => prev.filter(id => !allIds.includes(id)));
            } else {
                setIncomeIds(prev => {
                    const newIds = new Set([...prev, ...allIds]);
                    return Array.from(newIds);
                });
            }
        } else {
            setPortfolios(prev => prev.map(p => {
                if (p.id !== portfolioId) return p;
                const allSelected = allIds.every(id => p.expenseCategoryIds.includes(id));
                if (allSelected) {
                    return { ...p, expenseCategoryIds: p.expenseCategoryIds.filter(id => !allIds.includes(id)) };
                } else {
                    const newIds = new Set([...p.expenseCategoryIds, ...allIds]);
                    return { ...p, expenseCategoryIds: Array.from(newIds) };
                }
            }));
        }
    };

    const removePortfolio = async (id) => {
        if (id.toString().startsWith('temp_')) {
            setPortfolios(prev => prev.filter(p => p.id !== id));
            return;
        }

        try {
            await deleteBudgetPortfolio(user.uid, id);
            setPortfolios(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setError(null);
        try {
            // Save settings
            await saveBudgetSettings(user.uid, { incomeCategoryIds: incomeIds });
            
            // Save portfolios
            for (const p of portfolios) {
                if (p.percentage > 0) {
                    await saveBudgetPortfolio(user.uid, {
                        id: p.isNew ? undefined : p.id,
                        name: p.name,
                        percentage: p.percentage,
                        expenseCategoryIds: p.expenseCategoryIds
                    });
                } else if (!p.isNew) {
                    // If percentage is 0, delete it
                    await deleteBudgetPortfolio(user.uid, p.id);
                }
            }
            
            alert("Đã lưu thành công!");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const totalPercentage = portfolios.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);
    const isValid = totalPercentage <= 100 && incomeIds.length > 0;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-500" />
                    Tự động phân bổ ngân quỹ
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Thiết lập quy tắc tính ngân quỹ dựa trên các nguồn thu nhập bạn chỉ định.
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Bước 1: Chọn Nguồn Thu Nhập */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">1. Chọn Nguồn Thu Nhập Cơ Sở</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Chọn các danh mục thu nhập sẽ được dùng để tính toán phân bổ ngân quỹ (Ví dụ: Chỉ chọn "Tiền lương").
                </p>
                <div className="space-y-4">
                    {incomeCategories.map(parentCat => {
                        const allIds = [parentCat.id, ...(parentCat.subcategories?.map(s => s.id) || [])];
                        const isAllSelected = allIds.every(id => incomeIds.includes(id));

                        return (
                            <details key={parentCat.id} open className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm [&_summary::-webkit-details-marker]:hidden">
                                <summary className="list-none bg-slate-100/50 dark:bg-slate-800/50 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center justify-between cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors select-none">
                                    <div className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); toggleParentGroup(parentCat, true); }}>
                                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isAllSelected ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                                            {isAllSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <span>{parentCat.icon}</span>
                                        <span>{parentCat.name}</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 border-t border-slate-200 dark:border-slate-700">
                                    {/* Parent Category if it has no subcategories, otherwise we don't show the [Chính] block */}
                                    {(!parentCat.subcategories || parentCat.subcategories.length === 0) && (
                                        <button
                                            onClick={() => toggleIncomeCategory(parentCat.id)}
                                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                                                incomeIds.includes(parentCat.id) 
                                                    ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500 shadow-sm' 
                                                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${incomeIds.includes(parentCat.id) ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                {incomeIds.includes(parentCat.id) && <Check className="w-3 h-3" />}
                                            </div>
                                            <span className={`text-sm font-medium truncate ${incomeIds.includes(parentCat.id) ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {parentCat.name}
                                            </span>
                                        </button>
                                    )}
                                {/* Sub Categories */}
                                {parentCat.subcategories?.map(subCat => {
                                    const isSelected = incomeIds.includes(subCat.id);
                                    return (
                                        <button
                                            key={subCat.id}
                                            onClick={() => toggleIncomeCategory(subCat.id)}
                                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                                                isSelected 
                                                    ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500 shadow-sm' 
                                                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                            <span className="text-sm">{subCat.icon}</span>
                                            <span className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {subCat.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </details>
                    );
                    })}
                </div>
                {incomeIds.length === 0 && (
                    <p className="text-sm text-rose-500 mt-2 font-medium flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Vui lòng chọn ít nhất 1 nguồn thu nhập.
                    </p>
                )}
            </div>

            {/* Bước 2: Tạo Nhóm Ngân Quỹ */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">2. Các Nhóm Ngân Quỹ</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Nhóm nhiều danh mục chi tiêu vào chung một ngân quỹ.
                        </p>
                    </div>
                    <button 
                        onClick={addPortfolio}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-lg text-sm font-bold transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm Nhóm
                    </button>
                </div>

                <div className={`p-4 rounded-xl border flex justify-between items-center ${
                    totalPercentage <= 100 
                        ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' 
                        : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                }`}>
                    <span className="font-medium">Tổng phần trăm đã phân bổ:</span>
                    <span className="font-bold text-lg">{totalPercentage.toFixed(1)}% / 100%</span>
                </div>

                <div className="space-y-4">
                    {portfolios.map((portfolio, index) => (
                        <div key={portfolio.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">TÊN NHÓM</label>
                                            <input
                                                type="text"
                                                value={portfolio.name}
                                                onChange={(e) => updatePortfolio(portfolio.id, 'name', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white font-medium"
                                                placeholder="VD: Ăn uống cơ bản"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">PHẦN TRĂM (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={portfolio.percentage}
                                                    onChange={(e) => updatePortfolio(portfolio.id, 'percentage', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 pr-8 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white font-medium"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removePortfolio(portfolio.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors mt-5"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">CÁC DANH MỤC CHI TIÊU THUỘC NHÓM NÀY</label>
                                <div className="space-y-3">
                                    {expenseCategories.map(parentCat => {
                                        const allIds = [parentCat.id, ...(parentCat.subcategories?.map(s => s.id) || [])];
                                        const isAllSelected = allIds.every(id => portfolio.expenseCategoryIds.includes(id));
                                        
                                        return (
                                            <details key={parentCat.id} open className="group bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 [&_summary::-webkit-details-marker]:hidden">
                                                <summary className="list-none flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none rounded-xl group-open:rounded-b-none group-open:border-b border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); toggleParentGroup(parentCat, false, portfolio.id); }}>
                                                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${isAllSelected ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                                                            {isAllSelected && <Check className="w-2.5 h-2.5" />}
                                                        </div>
                                                        <span className="text-sm">{parentCat.icon}</span>
                                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">{parentCat.name}</span>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                                                </summary>
                                                <div className="p-3 flex flex-wrap gap-2">
                                                    {/* Parent if no subcategories */}
                                                    {(!parentCat.subcategories || parentCat.subcategories.length === 0) && (
                                                        <button
                                                            onClick={() => toggleExpenseCategory(portfolio.id, parentCat.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                                                portfolio.expenseCategoryIds.includes(parentCat.id)
                                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300 shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                                                            }`}
                                                        >
                                                            <span>{parentCat.name}</span>
                                                            {portfolio.expenseCategoryIds.includes(parentCat.id) && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                                        </button>
                                                    )}
                                                {/* Subs */}
                                                {parentCat.subcategories?.map(subCat => {
                                                    const isSelected = portfolio.expenseCategoryIds.includes(subCat.id);
                                                    return (
                                                        <button
                                                            key={subCat.id}
                                                            onClick={() => toggleExpenseCategory(portfolio.id, subCat.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                                                isSelected
                                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300 shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                                                            }`}
                                                        >
                                                            <span>{subCat.icon}</span>
                                                            <span>{subCat.name}</span>
                                                            {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {portfolios.length === 0 && (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-500 dark:text-slate-400">Bạn chưa tạo nhóm ngân quỹ nào.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !isValid}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Đang lưu...' : 'Lưu tất cả cấu hình'}
                </button>
            </div>
        </div>
    );
};

export default BudgetSettings;
