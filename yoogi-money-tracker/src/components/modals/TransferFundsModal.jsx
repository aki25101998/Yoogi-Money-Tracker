import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, Check, Clock } from 'lucide-react';
import AmountInput from '../ui/AmountInput';

const TransferFundsModal = ({ isOpen, onClose, wallets, onSave, onDelete, initialData }) => {
    const getCurrentTime = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const [fromWallet, setFromWallet] = useState('');
    const [toWallet, setToWallet] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    const [time, setTime] = useState(getCurrentTime());

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                let parsedDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                let parsedTime = initialData.time || (initialData.createdAt ? new Date(initialData.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : getCurrentTime());

                if (initialData.date) {
                    if (initialData.date.includes('T')) {
                        const d = new Date(initialData.date);
                        parsedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                        parsedTime = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    } else {
                        parsedDate = initialData.date;
                    }
                }

                setFromWallet(initialData.walletId || '');
                setToWallet(initialData.transferTo || '');
                setDescription(initialData.description || '');
                setAmount(initialData.amount || '');
                setDate(parsedDate);
                setTime(parsedTime);
            } else if (wallets?.length > 0) {
                setFromWallet(wallets[0]?.id);
                setToWallet(wallets.length > 1 ? wallets[1]?.id : wallets[0]?.id);
                setDescription('');
                setAmount('');
                setDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
                setTime(getCurrentTime());
            }
        }
    }, [isOpen, wallets, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        let combinedDate = date;
        try {
            const d = new Date();
            const [year, month, day] = date.split('-');
            const [hours, minutes] = time.split(':');
            d.setFullYear(year, month - 1, day);
            d.setHours(hours, minutes, 0, 0);
            combinedDate = d.toISOString();
        } catch (err) {
            console.error('Error combining date', err);
        }

        onSave({
            ...(initialData ? { id: initialData.id } : {}),
            type: 'transfer',
            categoryId: 'transfer',
            subcategoryId: '',
            walletId: fromWallet,
            transferTo: toWallet,
            description,
            amount: parseFloat(amount) || 0,
            date: combinedDate,
            time

        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Chuyển tiền</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>
                <div className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <div className="flex flex-col items-center w-full relative">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                            {initialData ? 'Chỉnh sửa chuyển nhượng' : 'Di chuyển Quỹ'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{initialData ? 'Chỉnh sửa bản chuyển nhượng của bạn bên dưới.' : 'Chuyển tiền đến ví khác'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 space-y-4">
                        {/* From Wallet */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Chọn ví</label>
                            <div className="flex flex-wrap gap-2">
                                {wallets?.map(w => (
                                    <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => setFromWallet(w.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${fromWallet === w.id ? 'border-2 border-teal-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white' : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        {w.name}
                                        {fromWallet === w.id && <div className="bg-teal-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700"></div>

                        {/* To Wallet */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Đến ví</label>
                            <div className="flex flex-wrap gap-2">
                                {wallets?.map(w => (
                                    <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => setToWallet(w.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${toWallet === w.id ? 'border-2 border-teal-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white' : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        {w.name}
                                        {toWallet === w.id && <div className="bg-teal-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Chi tiết</label>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Mục"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                            <AmountInput
                                placeholder="Số tiền"
                                required
                                value={amount}
                                onChange={setAmount}
                                colorTheme="teal"
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />

                            <div className="relative">
                                <span className="absolute top-2 left-4 text-xs text-slate-400 font-medium">Ngày & Giờ</span>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="flex-1 px-4 pt-6 pb-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                    />
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-[120px] px-3 pt-6 pb-2 pl-9 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-sm"
                                        />
                                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        {initialData && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
                                        onDelete(initialData.id);
                                    }
                                }}
                                className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-colors shadow-lg shadow-rose-500/30"
                            >
                                Xóa
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-1 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-colors"
                        >
                            Lưu
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default TransferFundsModal;
