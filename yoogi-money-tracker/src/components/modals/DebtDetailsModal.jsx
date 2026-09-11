import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trash2, Pencil, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { updateDebt, updateTransaction, getTransactionByDebtId, deleteTransaction, markDebtPaidAtomic } from '../../utils/supabaseHelpers';
import AmountInput from '../ui/AmountInput';
import DebtHistoryList from './debt-details/DebtHistoryList';
import DebtActiveList from './debt-details/DebtActiveList';

const DebtDetailsModal = ({ isOpen, onClose, groupedDebt, onDeleteDebt, user, wallets, transactions }) => {
const [activeTab, setActiveTab] = useState('active'); // active, paid, history
    const [editingDebtId, setEditingDebtId] = useState(null);
    const [editForm, setEditForm] = useState({ amount: '', walletId: '', notes: '', date: '' });
    
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [paymentEditForm, setPaymentEditForm] = useState({ amount: '', walletId: '', notes: '', date: '' });
    
    const [isSaving, setIsSaving] = useState(false);
    const [payingDebtId, setPayingDebtId] = useState(null);
    const [confirmPaymentDebt, setConfirmPaymentDebt] = useState(null);

    if (!isOpen || !groupedDebt) return null;

    const startEdit = async (debt) => {
        setEditingDebtId(debt.id);
        const debtDate = debt.date || debt.createdAt || new Date().toISOString();
        const formattedDate = new Date(debtDate).toISOString().split('T')[0];
        setEditForm({ amount: debt.totalAmount, walletId: '', notes: debt.notes || '', date: formattedDate });
        
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
                repaidAmount: currentRepaid,
                notes: editForm.notes,
                status: newStatus,
                date: new Date(editForm.date).toISOString()
            });

            const txn = await getTransactionByDebtId(user.uid, debt.id);
            if (txn) {
                await updateTransaction(user.uid, txn.id, {
                    amount: amountNum,
                    walletId: editForm.walletId,
                    description: `${debt.personName} mượn: ${editForm.notes}`,
                    date: new Date(editForm.date).toISOString()
                });
            }
            
            setEditingDebtId(null);
        } catch (err) {
            alert("Lỗi: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuickPayClick = async (debt) => {
        let defaultWalletId = '';
        if (user) {
            try {
                const txn = await getTransactionByDebtId(user.uid, debt.id);
                if (txn && txn.walletId) {
                    defaultWalletId = txn.walletId;
                } else if (wallets && wallets.length > 0) {
                    defaultWalletId = wallets[0].id;
                }
            } catch (err) {}
        }
        setConfirmPaymentDebt({ debt, walletId: defaultWalletId });
    };

    const confirmQuickPay = async () => {
        if (!user || !confirmPaymentDebt) return;
        const { debt, walletId } = confirmPaymentDebt;
        
        if (!walletId) {
            alert("Vui lòng chọn ví để thanh toán.");
            return;
        }

        setPayingDebtId(debt.id);
        setConfirmPaymentDebt(null);

        try {
            await markDebtPaidAtomic(user.uid, debt.id, walletId);
        } catch (err) {
            alert("Lỗi thanh toán: " + err.message);
        } finally {
            setPayingDebtId(null);
        }
    };

    const startEditPayment = (payment) => {
        setEditingPaymentId(payment.id);
        const notesMatch = (payment.description || payment.note || '').match(/trả nợ:?\s*(.*)/);
        const notes = notesMatch ? notesMatch[1] : '';
        const paymentDate = payment.date || new Date().toISOString();
        const formattedDate = new Date(paymentDate).toISOString().split('T')[0];
        setPaymentEditForm({ amount: payment.amount, walletId: payment.walletId, notes, date: formattedDate });
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
                description: paymentEditForm.notes ? `${groupedDebt.personName} trả nợ ${paymentEditForm.notes}` : `${groupedDebt.personName} trả nợ`,
                date: new Date(paymentEditForm.date).toISOString()
            });

            if (diff !== 0) {
                let amountToDistribute = Math.abs(diff);
                
                if (diff > 0) {
                    const activeDebts = groupedDebt.debts
                        .filter(d => d.status === 'active')
                        .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
                        
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
                    const allDebts = [...groupedDebt.debts].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                    
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
                const allDebts = [...groupedDebt.debts].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                
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
    const sortedDebts = [...groupedDebt.debts].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateB - dateA;
    });
    const activeDebts = sortedDebts.filter(d => d.status === 'active');
    const paidDebts = sortedDebts.filter(d => d.status === 'paid');

    const paymentHistory = transactions?.filter(t => 
        t.type === 'loan_repaid' && 
        (groupedDebt.debts.some(d => d.id === t.debtId) || (t.description || t.note || '').includes(groupedDebt.personName))
    ).sort((a, b) => new Date(b.date) - new Date(a.date)) || [];

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setEditingDebtId(null);
        setEditingPaymentId(null);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md h-[85vh] max-h-[800px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
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

                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {activeTab !== 'history' ? (
                        <DebtActiveList
                            debts={activeTab === 'active' ? activeDebts : paidDebts}
                            wallets={wallets}
                            confirmPaymentDebt={confirmPaymentDebt}
                            setConfirmPaymentDebt={setConfirmPaymentDebt}
                            confirmQuickPay={confirmQuickPay}
                            editingDebtId={editingDebtId}
                            cancelEdit={cancelEdit}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            saveEdit={saveEdit}
                            isSaving={isSaving}
                            payingDebtId={payingDebtId}
                            handleQuickPayClick={handleQuickPayClick}
                            startEdit={startEdit}
                            onDeleteDebt={onDeleteDebt}
                        />
                    ) : (
                        <DebtHistoryList
                            paymentHistory={paymentHistory}
                            editingPaymentId={editingPaymentId}
                            paymentEditForm={paymentEditForm}
                            setPaymentEditForm={setPaymentEditForm}
                            wallets={wallets}
                            isSaving={isSaving}
                            cancelEditPayment={cancelEditPayment}
                            saveEditPayment={saveEditPayment}
                            startEditPayment={startEditPayment}
                            handleDeletePayment={handleDeletePayment}
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DebtDetailsModal;
