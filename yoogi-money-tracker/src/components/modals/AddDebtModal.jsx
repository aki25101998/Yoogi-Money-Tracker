import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import AmountInput from '../ui/AmountInput';
import { addDebt, addTransaction } from '../../utils/supabaseHelpers';

const AddDebtModal = ({ isOpen, onClose, user, wallets, payers, onAddPayer }) => {
const [form, setForm] = useState({
        personName: '',
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

    if (!isOpen) return null;

    const handleQuickAdd = async () => {
        if (onAddPayer) {
            const newName = await onAddPayer();
            if (newName) {
                setForm(prev => ({ ...prev, personName: newName }));
            }
        }
    };

    
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const safeSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await handleSubmit(e);
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            const amountNum = parseFloat(form.amount) || 0;
            
            // 1. Tạo khoản nợ trong bảng debts
            const debtData = {
                personName: form.personName,
                totalAmount: amountNum,
                repaidAmount: 0,
                status: 'active',
                date: new Date(form.date).toISOString()
            };
            const docRef = await addDebt(user.uid, debtData);

            // 2. Tạo giao dịch trừ tiền (loan_given)
            const transactionData = {
                type: 'loan_given',
                amount: amountNum,
                description: `${form.personName} mượn: ${form.notes}`,
                categoryId: 'loan_given', // We can use a virtual category or rely on type
                subcategoryId: '',
                date: new Date(form.date).toISOString(),
                time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                walletId: form.walletId,
                debtId: docRef.id
            };
            await addTransaction(user.uid, transactionData);

            onClose();
            setForm({
                personName: '',
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
                        Cho Mượn Tiền
                    </h3>
                    <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>

                <form onSubmit={safeSubmit} className="p-6 space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Người mượn</span>
                            <select
                                required
                                value={form.personName}
                                onChange={e => setForm({ ...form, personName: e.target.value })}
                                className="w-full pl-4 pr-10 pt-6 pb-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                            >
                                <option value="" disabled>Chọn người mượn</option>
                                {payers?.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <button 
                            type="button" 
                            onClick={handleQuickAdd}
                            className="px-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-colors whitespace-nowrap font-medium text-sm flex items-center justify-center"
                        >
                            Thêm mới
                        </button>
                    </div>

                    <div>
                        <AmountInput
                            placeholder="Số tiền cho mượn"
                            required
                            value={form.amount}
                            onChange={(value) => setForm({ ...form, amount: value })}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                        />
                    </div>

                    <div className="relative">
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Trích tiền từ ví</span>
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
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Ngày cho mượn</span>
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

export default AddDebtModal;
