import React from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, PieChart } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const PortfolioTransactionsModal = ({ isOpen, onClose, portfolio, transactions, categories, onEditTransaction, onDeleteTransaction }) => {
    if (!isOpen || !portfolio) return null;

    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Group transactions by parent category and then by subcategory
    const groupedData = transactions.reduce((acc, txn) => {
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
        const parentIcon = parentCat ? parentCat.icon : '📁';

        if (!acc[parentId]) {
            acc[parentId] = {
                id: parentId,
                name: parentName,
                icon: parentIcon,
                amount: 0,
                subItems: []
            };
        }

        acc[parentId].amount += (txn.amount || 0);

        if (subCat) {
            let existingSub = acc[parentId].subItems.find(s => s.id === subCat.id);
            if (!existingSub) {
                existingSub = { id: subCat.id, name: subCat.name, amount: 0, isSub: true };
                acc[parentId].subItems.push(existingSub);
            }
            existingSub.amount += (txn.amount || 0);
        } else {
            let existingMain = acc[parentId].subItems.find(s => !s.isSub);
            if (!existingMain) {
                existingMain = { id: 'main', name: 'Chung', amount: 0, isSub: false };
                acc[parentId].subItems.push(existingMain);
            }
            existingMain.amount += (txn.amount || 0);
        }

        return acc;
    }, {});

    const categoryList = Object.values(groupedData)
        .map(parent => {
            if (parent.subItems.length === 1 && !parent.subItems[0].isSub) {
                parent.subItems = [];
            }
            parent.subItems.sort((a, b) => b.amount - a.amount);
            return parent;
        })
        .sort((a, b) => b.amount - a.amount);

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                            <PieChart className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{portfolio.name}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                Tổng chi: <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalAmount)}</span>
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
                <div className="flex-1 overflow-y-auto p-2 flex flex-col">
                    {categoryList.length > 0 && (
                        <div className="mx-2 mt-2 mb-4 px-4 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Chi tiết danh mục</h3>
                            <div className="space-y-4">
                                {categoryList.map((cat, index) => {
                                    const percentage = totalAmount > 0 ? ((cat.amount / totalAmount) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={index} className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                                                    <span className="text-slate-700 dark:text-slate-200 truncate font-bold">{cat.icon} {cat.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(cat.amount)}</span>
                                                    <span className="text-xs font-bold text-slate-400 w-10 text-right">{percentage}%</span>
                                                </div>
                                            </div>
                                            {cat.subItems.length > 0 && (
                                                <div className="pl-4 space-y-2 mt-1 border-l-2 border-slate-200 dark:border-slate-700 ml-1">
                                                    {cat.subItems.map((sub, subIdx) => {
                                                        const subPercentage = totalAmount > 0 ? ((sub.amount / totalAmount) * 100).toFixed(1) : 0;
                                                        return (
                                                            <div key={subIdx} className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <span className="text-slate-500 dark:text-slate-400 truncate text-sm">{sub.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-medium text-slate-500 dark:text-slate-400 text-sm">{formatCurrency(sub.amount)}</span>
                                                                    <span className="text-xs font-medium text-slate-400 w-10 text-right">{subPercentage}%</span>
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

                    {transactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            Không có giao dịch nào trong nhóm này.
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
                                            <p className="text-xs text-slate-400 mt-0.5">{new Date(txn.date).toLocaleDateString('vi-VN')}{txn.time ? ` • ${txn.time}` : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-base font-bold ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
                                            </span>
                                            {onDeleteTransaction && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteTransaction(txn.id);
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
        </div>,
        document.body
    );
};

export default PortfolioTransactionsModal;
