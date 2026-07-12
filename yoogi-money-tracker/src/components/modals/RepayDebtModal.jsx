import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import { updateDebt, addTransaction } from '../../utils/supabaseHelpers';
import { formatCurrency } from '../../utils/formatters';
import AmountInput from '../ui/AmountInput';

const RepayDebtModal = ({ isOpen, onClose, user, wallets, debt, categories }) => {
    const [form, setForm] = useState({
        amount: '',
        walletId: '',
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (isOpen && wallets?.length > 0 && !form.walletId) {
            setForm(prev => ({ ...prev, walletId: wallets.find(w => w.isDefault)?.id || wallets[0].id }));
        }
    }, [isOpen, wallets]);

    if (!isOpen || !debt) return null;

    const remaining = debt.totalAmount - (debt.repaidAmount || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            const amountNum = parseFloat(form.amount) || 0;
            if (amountNum <= 0) return;
            
            const activeDebts = debt.debts
                .filter(d => d.status === 'active')
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // oldest first

            let amountToDistribute = amountNum;

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

            const matchedCategoryId = categories?.find(c => c.type === 'loan_repaid')?.id || 'loan_repaid';

            // 2. Tạo giao dịch cộng tiền (loan_repaid)
            const transactionData = {
                type: 'loan_repaid',
                amount: amountNum,
                description: `${debt.personName} trả nợ: ${form.notes}`,
                categoryId: matchedCategoryId,
                subcategoryId: '',
                date: new Date(form.date).toISOString(),
                time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                walletId: form.walletId,
            };
            if (activeDebts.length > 0) {
                transactionData.debtId = activeDebts[0].id;
            }
            await addTransaction(user.uid, transactionData);

            onClose();
            setForm({
                amount: '',
                walletId: wallets.find(w => w.isDefault)?.id || wallets[0]?.id || '',
                date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
                notes: ''
            });
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                        Nhận Tiền Trả Nợ
                    </h3>
                    <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>

                <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Nhận tiền trả từ <span className="font-bold text-slate-800 dark:text-white">{debt.personName}</span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Còn nợ: <span className="font-bold text-orange-500">{formatCurrency(remaining)}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <AmountInput
                            placeholder="Số tiền được trả"
                            required
                            value={form.amount}
                            onChange={(value) => setForm({ ...form, amount: value })}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                        />
                        <button 
                            type="button" 
                            onClick={() => setForm({ ...form, amount: remaining })}
                            className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 ml-1 font-medium hover:underline"
                        >
                            Trả toàn bộ ({formatCurrency(remaining)})
                        </button>
                    </div>

                    <div className="relative">
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Nhận tiền vào ví</span>
                        <select
                            required
                            value={form.walletId}
                            onChange={e => setForm({ ...form, walletId: e.target.value })}
                            className="w-full pl-4 pr-10 pt-6 pb-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                        >
                            <option value="" disabled>Chọn ví</option>
                            {wallets?.map(w => (
                                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Ngày nhận</span>
                        <input
                            type="date"
                            required
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                            className="w-full px-4 pt-6 pb-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <input
                            type="text"
                            placeholder="Ghi chú thêm"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-colors"
                        >
                            Xác nhận
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default RepayDebtModal;
