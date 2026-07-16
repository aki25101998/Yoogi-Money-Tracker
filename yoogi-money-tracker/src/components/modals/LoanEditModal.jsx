import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, ChevronDown } from 'lucide-react';
import { updateTransaction, updateDebt, updateInstallmentPartialPayment } from '../../utils/supabaseHelpers';

const LoanEditModal = ({ 
    isOpen, 
    onClose, 
    transaction, 
    user, 
    wallets, 
    debts,
    onDeleteRequest, // Optional: If we want to handle delete externally (e.g., to open a confirm modal)
    onSuccess // Optional: Callback when save is successful
}) => {
const [form, setForm] = useState({
        amount: '',
        walletId: '',
        notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && transaction) {
            let notes = '';
            if (transaction.type === 'loan_given' || transaction.type === 'loan_repaid') {
                const match = transaction.description?.match(/(?:mượn|trả nợ)(?::\s*)?(.*)/);
                notes = match ? match[1]?.trim() || '' : '';
            } else if (transaction.type === 'installment_repaid') {
                notes = transaction.description || '';
            }

            setForm({
                amount: transaction.amount || '',
                walletId: transaction.walletId || (wallets?.length > 0 ? wallets[0].id : ''),
                notes
            });
        }
    }, [isOpen, transaction, wallets]);

    if (!isOpen || !transaction) return null;

    const handleSave = async () => {
        if (!user || !transaction) return;
        setIsSaving(true);
        try {
            const amountNum = parseFloat(form.amount) || 0;
            const diff = amountNum - (transaction.amount || 0);

            if (transaction.type === 'loan_given') {
                const personMatch = transaction.description?.match(/(?:Cho )?(.+?) mượn/);
                const personName = personMatch ? personMatch[1] : '';
                await updateTransaction(user.uid, transaction.id, {
                    amount: amountNum,
                    walletId: form.walletId,
                    description: `${personName} mượn${form.notes ? ': ' + form.notes : ''}`
                });

                if (transaction.debtId && debts) {
                    const debt = debts.find(d => d.id === transaction.debtId);
                    if (debt) {
                        const currentRepaid = debt.repaidAmount || 0;
                        const newStatus = currentRepaid >= amountNum ? 'paid' : 'active';
                        await updateDebt(user.uid, transaction.debtId, {
                            totalAmount: amountNum,
                            notes: form.notes,
                            status: newStatus
                        });
                    }
                }
            } else if (transaction.type === 'loan_repaid') {
                const personMatch = transaction.description?.match(/^(.+?) trả nợ/);
                const personName = personMatch ? personMatch[1] : '';
                await updateTransaction(user.uid, transaction.id, {
                    amount: amountNum,
                    walletId: form.walletId,
                    description: `${personName} trả nợ${form.notes ? ': ' + form.notes : ''}`
                });

                if (transaction.debtId && diff !== 0 && debts) {
                    const debt = debts.find(d => d.id === transaction.debtId);
                    if (debt) {
                        const newRepaidAmount = Math.max(0, (debt.repaidAmount || 0) + diff);
                        const newStatus = newRepaidAmount >= debt.totalAmount ? 'paid' : 'active';
                        await updateDebt(user.uid, transaction.debtId, {
                            repaidAmount: newRepaidAmount,
                            status: newStatus
                        });
                    }
                }
            } else if (transaction.type === 'installment_repaid') {
                await updateTransaction(user.uid, transaction.id, {
                    amount: amountNum,
                    walletId: form.walletId,
                    description: form.notes.trim() || transaction.description
                });

                const txMonthStr = transaction.date ? `${new Date(transaction.date).getFullYear()}-${String(new Date(transaction.date).getMonth() + 1).padStart(2, '0')}` : null;
                if (transaction.installmentId && txMonthStr && diff !== 0) {
                    await updateInstallmentPartialPayment(user.uid, transaction.installmentId, txMonthStr, diff);
                }
            }
            if (onSuccess) {
                let updatedDescription = transaction.description;
                if (transaction.type === 'loan_given' || transaction.type === 'loan_repaid') {
                    const personMatch = transaction.description?.match(/^(.+?)(?:mượn| trả nợ)/);
                    const personName = personMatch ? personMatch[1].trim() : '';
                    if (transaction.type === 'loan_given') {
                        updatedDescription = `${personName} mượn${form.notes ? ': ' + form.notes : ''}`;
                    } else {
                        updatedDescription = `${personName} trả nợ${form.notes ? ': ' + form.notes : ''}`;
                    }
                } else if (transaction.type === 'installment_repaid') {
                    updatedDescription = form.notes.trim() || transaction.description;
                }
                
                onSuccess({
                    ...transaction,
                    amount: amountNum,
                    walletId: form.walletId,
                    description: updatedDescription
                });
            }

            onClose();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    let title = 'Chỉnh sửa giao dịch';
    if (transaction.type === 'loan_given') title = 'Chỉnh sửa khoản cho mượn';
    else if (transaction.type === 'loan_repaid') title = 'Chỉnh sửa khoản trả nợ';
    else if (transaction.type === 'installment_repaid') title = 'Chỉnh sửa khoản trả nợ';

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                            {title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{transaction.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={(e) => { 
                                onClose(); 
                                if (onDeleteRequest) onDeleteRequest(e, transaction.id); 
                            }} 
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                            title="Xóa giao dịch này"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            {transaction.type === 'loan_given' ? 'Số tiền cho mượn' : 'Số tiền đã trả'}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={form.amount}
                            onChange={e => setForm({ ...form, amount: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">
                            {transaction.type === 'loan_given' ? 'Trích tiền từ ví' : 'Nhận vào ví'}
                        </label>
                        <div className="relative">
                            <select
                                value={form.walletId}
                                onChange={e => setForm({ ...form, walletId: e.target.value })}
                                className="w-full px-4 py-3 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                            >
                                {wallets?.map(w => (
                                    <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-400 font-medium block mb-1">Mô tả / Ghi chú</label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Đang lưu...' : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Lưu thay đổi
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LoanEditModal;
