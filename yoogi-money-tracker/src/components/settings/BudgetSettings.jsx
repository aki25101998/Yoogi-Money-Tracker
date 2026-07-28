import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Plus, Trash2, PieChart, Check } from 'lucide-react';
import { saveBudgetSettings, saveBudgetPortfolio, deleteBudgetPortfolio } from '../../services/budgetService';

const BudgetSettings = ({ user, budgetSettings, budgetPortfolios, categories }) => {
    // State for Budget Settings (Income Sources)
    const [incomeIds, setIncomeIds] = useState([]);
    
    // State for Portfolios
    const [portfolios, setPortfolios] = useState([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const flattenCategories = (cats, type) => {
        let flat = [];
        cats.filter(c => c.type === type).forEach(c => {
            flat.push({ ...c, isSub: false });
            if (c.subcategories && c.subcategories.length > 0) {
                c.subcategories.forEach(sub => {
                    flat.push({ ...sub, isSub: true, parentName: c.name });
                });
            }
        });
        return flat;
    };

    const flatIncomeCategories = flattenCategories(categories, 'income');
    const flatExpenseCategories = flattenCategories(categories, 'expense');

    useEffect(() => {
        if (budgetSettings) {
            setIncomeIds(budgetSettings.incomeCategoryIds || []);
        }
        if (budgetPortfolios) {
            setPortfolios(budgetPortfolios);
        }
    }, [budgetSettings, budgetPortfolios]);

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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {flatIncomeCategories.map(cat => {
                        const isSelected = incomeIds.includes(cat.id);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => toggleIncomeCategory(cat.id)}
                                className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                                    isSelected 
                                        ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500' 
                                        : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <span className="text-lg">{cat.icon}</span>
                                <div className={`flex flex-col items-start overflow-hidden ${isSelected ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                    <span className="text-sm font-medium truncate w-full text-left">
                                        {cat.name}
                                    </span>
                                    {cat.isSub && (
                                        <span className="text-[10px] font-normal opacity-70 truncate w-full text-left">
                                            Thuộc: {cat.parentName}
                                        </span>
                                    )}
                                </div>
                            </button>
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
                                <div className="flex flex-wrap gap-2">
                                    {flatExpenseCategories.map(cat => {
                                        const isSelected = portfolio.expenseCategoryIds.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleExpenseCategory(portfolio.id, cat.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                                    isSelected
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300'
                                                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                                                }`}
                                                title={cat.isSub ? `Danh mục phụ của ${cat.parentName}` : 'Danh mục chính'}
                                            >
                                                <span>{cat.icon}</span>
                                                <div className="flex flex-col items-start leading-tight">
                                                    <span>{cat.name}</span>
                                                    {cat.isSub && <span className="text-[10px] opacity-70 font-normal">({cat.parentName})</span>}
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                            </button>
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
