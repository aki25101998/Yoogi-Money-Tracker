import React from 'react';
import { Clock, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const RecentTransactionsList = ({
    recentTransactions,
    categories,
    wallets,
    setEditingTransaction,
    setIsTransferModalOpen,
    setIsModalOpen,
    openDeleteModal
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Giao dịch gần đây</h3>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {recentTransactions.length === 0 ? (
                    <div className="px-5 py-8 text-center text-slate-400 text-sm">
                        Chưa có giao dịch.
                    </div>
                ) : (
                    recentTransactions.map(txn => {
                        const cat = categories.find(c => c.id === txn.categoryId);
                        const wallet = wallets?.find(w => w.id === txn.walletId);
                        const isIncome = txn.type === 'income' || txn.type === 'loan_repaid';
                        const isExpense = txn.type === 'expense' || txn.type === 'loan_given';
                        const isLoan = txn.type === 'loan_given' || txn.type === 'loan_repaid';
                        
                        return (
                            <div key={txn.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group" onClick={() => { 
                                setEditingTransaction(txn); 
                                if (txn.type === 'transfer') setIsTransferModalOpen(true);
                                else setIsModalOpen(true); 
                            }}>
                                <div className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center text-2xl shadow-inner ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : (isExpense ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-slate-100 dark:bg-slate-800')}`}>
                                    {cat?.icon || (isLoan ? (txn.type === 'loan_given' ? '📤' : '📥') : (txn.type === 'transfer' ? '💸' : '❓'))}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate mb-0.5">
                                        {txn.type === 'transfer' ? `${wallets?.find(w => w.id === txn.walletId)?.name || '?'} ➝ ${wallets?.find(w => w.id === txn.transferTo)?.name || '?'}` 
                                        : (txn.type === 'loan_given' ? `Cho mượn ( Ví: ${wallet?.name || '?'} )` 
                                        : (txn.type === 'loan_repaid' ? `Nhận trả nợ ( Ví: ${wallet?.name || '?'} )`
                                        : `${wallet?.name || 'Chưa phân ví'} • ${cat?.name || '❓ Chưa phân loại'} ${txn.subcategoryId && cat?.subcategories?.find(s => s.id === txn.subcategoryId) ? `> ${cat.subcategories.find(s => s.id === txn.subcategoryId).name}` : ''}`))}
                                    </p>
                                    <div className="flex flex-col gap-1 mt-0.5">
                                        {(txn.time || txn.createdAt) && (
                                            <div className="flex items-center">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                    <Clock className="w-3 h-3" />
                                                    {(() => {
                                                        const tTime = txn.time || new Date(txn.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                                        const tDateStr = txn.date ? txn.date.split('T')[0] : (txn.createdAt ? new Date(txn.createdAt).toISOString().split('T')[0] : '');
                                                        if (!tDateStr) return tTime;
                                                        
                                                        const today = new Date();
                                                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                                        
                                                        const yesterday = new Date(today);
                                                        yesterday.setDate(yesterday.getDate() - 1);
                                                        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                                                        
                                                        if (tDateStr === todayStr) return `Hôm nay, ${tTime}`;
                                                        if (tDateStr === yesterdayStr) return `Hôm qua, ${tTime}`;
                                                        
                                                        const parts = tDateStr.split('-');
                                                        if (parts.length === 3) {
                                                            return `${parts[2]}/${parts[1]}, ${tTime}`;
                                                        }
                                                        return tTime;
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                        {(txn.description || txn.note) && (
                                            <p className="font-medium text-slate-500 dark:text-slate-400 text-xs line-clamp-1">
                                                {isLoan && (txn.description || txn.note) ? (txn.description || txn.note).replace(/^(?:Cho )?.*?(?:mượn|trả nợ):\s*/, '') : (txn.description || txn.note)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right">
                                        <p className={`font-bold text-sm whitespace-nowrap flex items-center justify-end gap-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : (isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}`}>
                                            <span className="flex-shrink-0 w-4 flex items-center justify-center">
                                                {isIncome ? <ArrowUpRight className="w-4 h-4" /> : (isExpense ? <ArrowDownRight className="w-4 h-4" /> : '⇄')}
                                            </span>
                                            <span className="tabular-nums">{formatCurrency(txn.amount)}</span>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); openDeleteModal(e, txn.id); }} 
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default RecentTransactionsList;
