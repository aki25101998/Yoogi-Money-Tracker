import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trash2, Pencil, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { updateDebt, updateTransaction, getTransactionByDebtId, deleteTransaction } from '../../utils/firebaseHelpers';

const DebtDetailsModal = ({ isOpen, onClose, groupedDebt, onDeleteDebt, user, wallets, transactions }) => {
    const [activeTab, setActiveTab] = useState('active'); // active, paid, history
    const [editingDebtId, setEditingDebtId] = useState(null);
    const [editForm, setEditForm] = useState({ amount: '', walletId: '', notes: '' });
    
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [paymentEditForm, setPaymentEditForm] = useState({ amount: '', walletId: '', notes: '' });
    
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen || !groupedDebt) return null;

    const startEdit = async (debt) => {
        setEditingDebtId(debt.id);
        setEditForm({ amount: debt.totalAmount, walletId: '', notes: debt.notes || '' });
        
        if (user) {
            const txn = await getTransactionByDebtId(user.uid, debt.id);
            if (txn) {
                setEditForm(prev => ({ ...prev, walletId: txn.walletId }));
            }
        }
    };

    const cancelEdit = () => {
        setEditingDebtId(null);
    };

    const saveEdit = async (debt) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const amountNum = parseFloat(editForm.amount) || 0;
            const currentRepaid = debt.repaidAmount || 0;
            const newStatus = currentRepaid >= amountNum ? 'paid' : 'active';
            
            await updateDebt(user.uid, debt.id, {
                totalAmount: amountNum,
                notes: editForm.notes,
                status: newStatus
            });

            const txn = await getTransactionByDebtId(user.uid, debt.id);
            if (txn) {
                await updateTransaction(user.uid, txn.id, {
                    amount: amountNum,
                    walletId: editForm.walletId,
                    description: `Cho ${debt.personName} mượn: ${editForm.notes}`
                });
            }
            
            setEditingDebtId(null);
        } catch (err) {
            alert("Lỗi: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const startEditPayment = (payment) => {
        setEditingPaymentId(payment.id);
        const notesMatch = payment.description.match(/trả nợ:\s*(.*)/);
        const notes = notesMatch ? notesMatch[1] : '';
        setPaymentEditForm({ amount: payment.amount, walletId: payment.walletId, notes });
    };

    const cancelEditPayment = () => {
        setEditingPaymentId(null);
    };

    const saveEditPayment = async (payment) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const oldAmount = payment.amount;
            const newAmountNum = parseFloat(paymentEditForm.amount) || 0;
            const diff = newAmountNum - oldAmount;

            await updateTransaction(user.uid, payment.id, {
                amount: newAmountNum,
                walletId: paymentEditForm.walletId,
                description: `${groupedDebt.personName} trả nợ: ${paymentEditForm.notes}`
            });

            if (diff !== 0) {
                let amountToDistribute = Math.abs(diff);
                
                if (diff > 0) {
                    const activeDebts = groupedDebt.debts
                        .filter(d => d.status === 'active')
                        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        
                    for (const d of activeDebts) {
                        if (amountToDistribute <= 0) break;
                        const dRemaining = d.totalAmount - (d.repaidAmount || 0);
                        if (dRemaining > 0) {
                            const payAmount = Math.min(amountToDistribute, dRemaining);
                            const newRepaidAmount = (d.repaidAmount || 0) + payAmount;
                            const newStatus = newRepaidAmount >= d.totalAmount ? 'paid' : 'active';
                            
                            await updateDebt(user.uid, d.id, {
                                repaidAmount: newRepaidAmount,
                                status: newStatus
                            });
                            amountToDistribute -= payAmount;
                        }
                    }
                } else {
                    const allDebts = [...groupedDebt.debts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    
                    for (const d of allDebts) {
                        if (amountToDistribute <= 0) break;
                        const dRepaid = d.repaidAmount || 0;
                        if (dRepaid > 0) {
                            const deductAmount = Math.min(amountToDistribute, dRepaid);
                            const newRepaidAmount = dRepaid - deductAmount;
                            const newStatus = newRepaidAmount >= d.totalAmount ? 'paid' : 'active';
                            
                            await updateDebt(user.uid, d.id, {
                                repaidAmount: newRepaidAmount,
                                status: newStatus
                            });
                            amountToDistribute -= deductAmount;
                        }
                    }
                }
            }
            
            setEditingPaymentId(null);
        } catch (err) {
            alert("Lỗi: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePayment = async (payment) => {
        if (!user) return;
        if (window.confirm('Bạn có chắc muốn xóa lịch sử trả này? Dữ liệu nợ sẽ bị cộng ngược lại.')) {
            try {
                let amountToDistribute = payment.amount;
                const allDebts = [...groupedDebt.debts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                for (const d of allDebts) {
                    if (amountToDistribute <= 0) break;
                    const dRepaid = d.repaidAmount || 0;
                    if (dRepaid > 0) {
                        const deductAmount = Math.min(amountToDistribute, dRepaid);
                        const newRepaidAmount = dRepaid - deductAmount;
                        const newStatus = newRepaidAmount >= d.totalAmount ? 'paid' : 'active';
                        
                        await updateDebt(user.uid, d.id, {
                            repaidAmount: newRepaidAmount,
                            status: newStatus
                        });
                        amountToDistribute -= deductAmount;
                    }
                }
                
                await deleteTransaction(user.uid, payment.id);
            } catch (err) {
                alert("Lỗi: " + err.message);
            }
        }
    };

    // Sort debts by date descending
    const sortedDebts = [...groupedDebt.debts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const activeDebts = sortedDebts.filter(d => d.status === 'active');
    const paidDebts = sortedDebts.filter(d => d.status === 'paid');

    const paymentHistory = transactions?.filter(t => 
        t.type === 'loan_repaid' && 
        (groupedDebt.debts.some(d => d.id === t.debtId) || t.description.includes(groupedDebt.personName))
    ).sort((a, b) => new Date(b.date) - new Date(a.date)) || [];

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setEditingDebtId(null);
        setEditingPaymentId(null);
    };

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
                            onClick={() => handleTabChange('active')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đang nợ ({activeDebts.length})
                        </button>
                        <button 
                            onClick={() => handleTabChange('paid')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'paid' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đã xong ({paidDebts.length})
                        </button>
                        <button 
                            onClick={() => handleTabChange('history')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Lịch sử ({paymentHistory.length})
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                    {activeTab !== 'history' ? (
                        (activeTab === 'active' ? activeDebts : paidDebts).length === 0 ? (
                            <div className="text-center text-slate-500 py-8">
                                Không có khoản nợ nào trong mục này.
                            </div>
                        ) : (
                            (activeTab === 'active' ? activeDebts : paidDebts).map(debt => {
                                const progress = debt.totalAmount > 0 ? Math.round(((debt.repaidAmount || 0) / debt.totalAmount) * 100) : 0;
                                const remaining = debt.totalAmount - (debt.repaidAmount || 0);

                                return (
                                    <div key={debt.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                                        {editingDebtId === debt.id ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-sm text-slate-800 dark:text-white">Chỉnh sửa khoản nợ</span>
                                                    <button onClick={cancelEdit} className="p-1"><X className="w-4 h-4 text-slate-400" /></button>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Số tiền mượn</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={editForm.amount}
                                                        onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Trích từ ví</label>
                                                    <div className="relative">
                                                        <select
                                                            value={editForm.walletId}
                                                            onChange={e => setEditForm({ ...editForm, walletId: e.target.value })}
                                                            className="w-full pl-3 pr-8 py-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer text-sm"
                                                        >
                                                            <option value="" disabled>Chọn ví</option>
                                                            {wallets?.map(w => (
                                                                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Ghi chú</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.notes}
                                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="pt-2">
                                                    <button
                                                        onClick={() => saveEdit(debt)}
                                                        disabled={isSaving}
                                                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                                    >
                                                        {isSaving ? 'Đang lưu...' : <><Check className="w-4 h-4" /> Lưu thay đổi</>}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
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
                                                            onClick={(e) => { e.stopPropagation(); startEdit(debt); }}
                                                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                            title="Sửa khoản nợ này"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
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
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        )
                    ) : (
                        // History Tab
                        paymentHistory.length === 0 ? (
                            <div className="text-center text-slate-500 py-8">
                                Chưa có lịch sử thanh toán nào.
                            </div>
                        ) : (
                            paymentHistory.map(payment => (
                                <div key={payment.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                                    {editingPaymentId === payment.id ? (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-white">Sửa lịch sử trả</span>
                                                <button onClick={cancelEditPayment} className="p-1"><X className="w-4 h-4 text-slate-400" /></button>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-medium block mb-1">Số tiền đã trả</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={paymentEditForm.amount}
                                                    onChange={e => setPaymentEditForm({ ...paymentEditForm, amount: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-medium block mb-1">Vào ví</label>
                                                <div className="relative">
                                                    <select
                                                        value={paymentEditForm.walletId}
                                                        onChange={e => setPaymentEditForm({ ...paymentEditForm, walletId: e.target.value })}
                                                        className="w-full pl-3 pr-8 py-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer text-sm"
                                                    >
                                                        <option value="" disabled>Chọn ví</option>
                                                        {wallets?.map(w => (
                                                            <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-medium block mb-1">Ghi chú</label>
                                                <input
                                                    type="text"
                                                    value={paymentEditForm.notes}
                                                    onChange={e => setPaymentEditForm({ ...paymentEditForm, notes: e.target.value })}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <button
                                                    onClick={() => saveEditPayment(payment)}
                                                    disabled={isSaving}
                                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                                >
                                                    {isSaving ? 'Đang lưu...' : <><Check className="w-4 h-4" /> Lưu thay đổi</>}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{new Date(payment.date).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <RefreshCw className="w-3 h-3" /> Thu hồi
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); startEditPayment(payment); }}
                                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="Sửa lịch sử trả"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeletePayment(payment); }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Xóa lịch sử trả"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-sm text-slate-600 dark:text-slate-400">Đã trả</span>
                                                    <span className="font-bold text-emerald-500">+{formatCurrency(payment.amount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                                    <span className="text-xs text-slate-400">Vào ví</span>
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        {wallets?.find(w => w.id === payment.walletId)?.name || 'Không rõ'}
                                                    </span>
                                                </div>
                                                {payment.description && (
                                                    <div className="pt-1">
                                                        <span className="text-xs text-slate-500 italic block">{payment.description}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DebtDetailsModal;
