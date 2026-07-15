import { useBackButton } from '../../hooks/useBackButton';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const PayInstallmentModal = ({ isOpen, onClose, wallets, selectedItems, onConfirm }) => {
    useBackButton(isOpen, onClose);
    const [form, setForm] = useState({
        walletId: '',
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    });

    useEffect(() => {
        if (isOpen) {
            setForm(prev => ({
                ...prev,
                walletId: prev.walletId || (wallets?.length > 0 ? wallets.find(w => w.isDefault)?.id || wallets[0].id : '')
            }));
        }
    }, [isOpen, wallets]);

    if (!isOpen || !selectedItems || selectedItems.length === 0) return null;

    const totalAmount = selectedItems.reduce((sum, wrapper) => sum + wrapper.item.monthlyPayment, 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({ ...form, totalAmount, items: selectedItems });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                        Thanh toán trả góp
                    </h3>
                    <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>

                <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Bạn đang thanh toán <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedItems.length} khoản</span>.
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Tổng cộng: <span className="font-bold text-2xl text-indigo-600 dark:text-indigo-400 block mt-1">{formatCurrency(totalAmount)}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="relative">
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Dùng nguồn tiền từ ví</span>
                        <select
                            required
                            value={form.walletId}
                            onChange={e => setForm({ ...form, walletId: e.target.value })}
                            className="w-full pl-4 pr-10 pt-6 pb-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                            <option value="" disabled>Chọn ví</option>
                            {wallets?.map(w => (
                                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Ngày thanh toán</span>
                        <input
                            type="date"
                            required
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                            className="w-full px-4 pt-6 pb-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto pr-2 mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-800 py-1">Chi tiết các khoản:</p>
                        {selectedItems.map((wrapper, index) => (
                            <div key={`${wrapper.item.id}-${wrapper.index}-${index}`} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                                <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{wrapper.item.name} (T{wrapper.monthStr.split('-')[1]})</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">{formatCurrency(wrapper.item.monthlyPayment)}</span>
                            </div>
                        ))}
                    </div>

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
                            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-colors flex justify-center items-center gap-2"
                        >
                            <CheckCircle2 className="w-5 h-5" /> Thanh toán
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default PayInstallmentModal;
