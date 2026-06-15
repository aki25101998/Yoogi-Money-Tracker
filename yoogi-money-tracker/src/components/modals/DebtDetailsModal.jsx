import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const DebtDetailsModal = ({ isOpen, onClose, groupedDebt, onDeleteDebt }) => {
    const [activeTab, setActiveTab] = useState('active');

    if (!isOpen || !groupedDebt) return null;

    // Sort debts by date descending
    const sortedDebts = [...groupedDebt.debts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const activeDebts = sortedDebts.filter(d => d.status === 'active');
    const paidDebts = sortedDebts.filter(d => d.status === 'paid');

    const displayDebts = activeTab === 'active' ? activeDebts : paidDebts;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Chi tiết nợ</h3>
                            <p className="text-sm text-slate-500">{groupedDebt.personName}</p>
                        </div>
                        <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đang nợ ({activeDebts.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('paid')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'paid' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đã hoàn thành ({paidDebts.length})
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                    {displayDebts.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            Không có khoản nợ nào trong mục này.
                        </div>
                    ) : (
                        displayDebts.map(debt => {
                        const progress = debt.totalAmount > 0 ? Math.round(((debt.repaidAmount || 0) / debt.totalAmount) * 100) : 0;
                        const remaining = debt.totalAmount - (debt.repaidAmount || 0);

                        return (
                            <div key={debt.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-medium">{new Date(debt.createdAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {debt.status === 'paid' && (
                                            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                Đã trả xong
                                            </div>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteDebt(debt.id); }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Xóa khoản nợ này"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Đã mượn</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(debt.totalAmount)}</span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Đã trả: {formatCurrency(debt.repaidAmount || 0)}</span>
                                            <span className="font-medium text-slate-500">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                    {debt.status === 'active' && (
                                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Còn nợ</span>
                                            <span className="font-bold text-orange-500">{formatCurrency(remaining)}</span>
                                        </div>
                                    )}
                                    {debt.notes && (
                                        <div className="pt-2">
                                            <span className="text-xs text-slate-500 italic block">Ghi chú: {debt.notes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DebtDetailsModal;
