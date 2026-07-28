import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Trash2, PieChart } from 'lucide-react';
import { saveBudgetRules, deleteBudgetRule } from '../../services/budgetService';

const BudgetSettings = ({ user, budgetRules, categories }) => {
    const [rules, setRules] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // Only expense categories
    const expenseCategories = categories.filter(c => c.type === 'expense');

    useEffect(() => {
        if (budgetRules) {
            setRules(budgetRules);
        }
    }, [budgetRules]);

    const handlePercentageChange = (categoryId, value) => {
        let percentage = parseFloat(value) || 0;
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;

        setRules(prev => {
            const existing = prev.find(r => r.categoryId === categoryId);
            if (existing) {
                return prev.map(r => r.categoryId === categoryId ? { ...r, percentage } : r);
            }
            return [...prev, { categoryId, percentage }];
        });
    };

    const handleDelete = async (categoryId) => {
        try {
            await deleteBudgetRule(user.uid, categoryId);
            setRules(prev => prev.filter(r => r.categoryId !== categoryId));
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setError(null);
        try {
            // Save only rules with percentage > 0
            const rulesToSave = rules.filter(r => r.percentage > 0);
            await saveBudgetRules(user.uid, rulesToSave);
            
            // Delete rules with percentage = 0
            const rulesToDelete = rules.filter(r => r.percentage === 0);
            for (const r of rulesToDelete) {
                await deleteBudgetRule(user.uid, r.categoryId);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const totalPercentage = rules.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
    const isValid = totalPercentage <= 100;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-500" />
                    Tự động phân bổ ngân quỹ
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Cài đặt phần trăm (%) thu nhập sẽ được tự động trích vào từng danh mục chi tiêu. 
                    Khi bạn thêm một khoản thu nhập mới, ngân quỹ sẽ tự động tăng lên tương ứng.
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className={`p-4 rounded-xl border ${isValid ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'} flex justify-between items-center`}>
                <span className="font-medium">Tổng ngân quỹ phân bổ:</span>
                <span className="font-bold text-lg">{totalPercentage.toFixed(1)}% / 100%</span>
            </div>

            <div className="space-y-3">
                {expenseCategories.map(cat => {
                    const rule = rules.find(r => r.categoryId === cat.id);
                    const percentage = rule ? rule.percentage : 0;
                    
                    return (
                        <div key={cat.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xl shrink-0">
                                {cat.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-slate-800 dark:text-white truncate">{cat.name}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={percentage || ''}
                                    onChange={(e) => handlePercentageChange(cat.id, e.target.value)}
                                    placeholder="0"
                                    className="w-20 px-3 py-1.5 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white font-medium"
                                />
                                <span className="text-slate-500 font-medium">%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !isValid}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
            </div>
        </div>
    );
};

export default BudgetSettings;
