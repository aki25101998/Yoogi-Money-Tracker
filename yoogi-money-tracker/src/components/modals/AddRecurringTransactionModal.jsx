import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Wallet, Check, ChevronDown, Clock, Repeat, BellRing } from 'lucide-react';
import { addRecurringTransaction } from '../../utils/supabaseHelpers';
import AmountInput from '../ui/AmountInput';

const AddRecurringTransactionModal = ({ isOpen, onClose, categories, user, wallets }) => {
const [form, setForm] = useState({
        type: 'expense',
        description: '',
        amount: '',
        categoryId: '',
        subcategoryId: '',
        nextDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
        intervalValue: '1',
        intervalUnit: 'Phút', // Set default to minute for testing as user requested
        notes: '',
        walletId: ''
    });

    // Set default wallet
    useEffect(() => {
        if (isOpen && wallets?.length > 0 && !form.walletId) {
            setForm(prev => ({ ...prev, walletId: wallets.find(w => w.isDefault)?.id || wallets[0].id }));
        }
    }, [isOpen, wallets]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert('Vui lòng đăng nhập.');
            return;
        }
        try {
            // Check if date is time-inclusive or just date. The input type="date" returns YYYY-MM-DD.
            // For minute intervals to work immediately, we should probably append the current time if the date is today.
            const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
            let nextDateObj = new Date(form.nextDate);
            if (form.nextDate === today) {
                // If it's today, set the time to now + interval
                const now = new Date();
                nextDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
                // For immediate execution or next minute
            }

            await addRecurringTransaction(user.uid, {
                ...form,
                amount: parseFloat(form.amount) || 0,
                nextDate: nextDateObj.toISOString(),
            });
            onClose();
        } catch (error) {
            console.error("Lỗi thêm giao dịch định kỳ:", error);
            alert("Lỗi: " + error.message);
        }
    };

    const getCategoriesByType = (type) => categories?.filter(c => c.type === type) || [];
    const getSubcategories = (categoryId) => {
        const cat = categories?.find(c => c.id === categoryId);
        return cat?.subcategories || [];
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                        Thêm Giao Dịch Định Kỳ
                    </h3>
                    <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    {/* Types Toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, type: 'expense', categoryId: '', subcategoryId: '' })}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${form.type === 'expense' ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                        >
                            Chi phí
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, type: 'income', categoryId: '', subcategoryId: '' })}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${form.type === 'income' ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                        >
                            Thu nhập
                        </button>
                    </div>

                    <div className="space-y-4 pt-2">
                        {/* Description */}
                        <div>
                            <input
                                type="text"
                                placeholder="Mục"
                                required
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none placeholder:text-slate-400"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <AmountInput
                                placeholder="Số tiền"
                                required
                                value={form.amount}
                                onChange={(value) => setForm({ ...form, amount: value })}
                                colorTheme="teal"
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none placeholder:text-slate-400"
                            />
                        </div>

                        {/* Wallet */}
                        <div className="relative">
                            <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Ví giao dịch</span>
                            <select
                                required
                                value={form.walletId}
                                onChange={e => setForm({ ...form, walletId: e.target.value })}
                                className="w-full pl-4 pr-10 pt-6 pb-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                            >
                                <option value="" disabled>Chọn ví</option>
                                {wallets?.map(w => (
                                    <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Category & Subcategory Group */}
                        <div className="pt-2">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Phân loại danh mục</h4>
                            <div className="space-y-3">
                                {/* Category */}
                                <div className="relative">
                                    <select
                                        required
                                        value={form.categoryId}
                                        onChange={e => setForm({ ...form, categoryId: e.target.value, subcategoryId: '' })}
                                        className="w-full pl-4 pr-10 py-3 appearance-none border border-slate-700/50 bg-[#161c2d] text-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer shadow-sm"
                                    >
                                        <option value="" disabled>Danh mục chính</option>
                                        {getCategoriesByType(form.type).map(c => (
                                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>

                                {/* Subcategory */}
                                <div className="relative">
                                    <select
                                        value={form.subcategoryId}
                                        onChange={e => setForm({ ...form, subcategoryId: e.target.value })}
                                        className="w-full pl-4 pr-10 py-3 appearance-none border border-slate-700/50 bg-[#161c2d] text-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer shadow-sm"
                                        disabled={!form.categoryId || getSubcategories(form.categoryId).length === 0}
                                    >
                                        <option value="">Danh mục phụ</option>
                                        {getSubcategories(form.categoryId).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="relative">
                            <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Bắt đầu từ ngày</span>
                            <input
                                type="date"
                                required
                                value={form.nextDate}
                                onChange={e => setForm({ ...form, nextDate: e.target.value })}
                                className="w-full px-4 pt-6 pb-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                        </div>

                        {/* Interval */}
                        <div className="relative flex gap-2">
                            <span className="absolute -top-2 left-4 text-[10px] bg-white dark:bg-slate-800 px-1 text-slate-400 font-medium z-10">Lặp lại sau mỗi...</span>
                            <div className="flex-1">
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={form.intervalValue}
                                    onChange={e => setForm({ ...form, intervalValue: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex-1 relative">
                                <select
                                    value={form.intervalUnit}
                                    onChange={e => setForm({ ...form, intervalUnit: e.target.value })}
                                    className="w-full pl-4 pr-10 py-3 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                                >
                                    <option value="Ngày">Ngày</option>
                                    <option value="Tuần">Tuần</option>
                                    <option value="Tháng">Tháng</option>
                                    <option value="Năm">Năm</option>
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <input
                                type="text"
                                placeholder="Ghi chú"
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-colors"
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

export default AddRecurringTransactionModal;
