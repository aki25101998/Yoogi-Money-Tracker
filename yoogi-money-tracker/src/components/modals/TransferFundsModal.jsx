import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, Check } from 'lucide-react';

const TransferFundsModal = ({ isOpen, onClose, wallets, onSave, onDelete, initialData }) => {
    const [fromWallet, setFromWallet] = useState('');
    const [toWallet, setToWallet] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFromWallet(initialData.walletId || '');
                setToWallet(initialData.transferTo || '');
                setDescription(initialData.description || '');
                setAmount(initialData.amount || '');
                setDate(initialData.date || new Date().toISOString().split('T')[0]);
            } else if (wallets?.length > 0) {
                setFromWallet(wallets[0]?.id);
                setToWallet(wallets.length > 1 ? wallets[1]?.id : wallets[0]?.id);
                setDescription('');
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen, wallets, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...(initialData ? { id: initialData.id } : {}),
            type: 'transfer',
            categoryId: 'transfer',
            subcategoryId: '',
            walletId: fromWallet,
            transferTo: toWallet,
            description,
            amount: parseFloat(amount) || 0,
            date
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
                        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-4"></div>
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
                            <input
                                type="number"
                                placeholder="Số tiền"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                            {amount && !isNaN(amount) && parseFloat(amount) > 0 && (
                                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 hide-scrollbar">
                                    {[1000, 10000, 100000].map(multiplier => {
                                        const suggestedValue = parseFloat(amount) * multiplier;
                                        return (
                                            <button
                                                key={multiplier}
                                                type="button"
                                                onClick={() => setAmount(suggestedValue)}
                                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 dark:hover:bg-teal-900/30 dark:hover:text-teal-400 dark:hover:border-teal-800 transition-colors"
                                            >
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(suggestedValue)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="relative">
                                <span className="absolute top-2 left-4 text-xs text-slate-400 font-medium">Ngày</span>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 pt-6 pb-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2 flex-col sm:flex-row">
                        <button
                            type="submit"
                            className="w-full py-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg transition-colors shadow-lg shadow-teal-500/30"
                        >
                            Lưu
                        </button>
                        
                        {initialData && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
                                        onDelete(initialData.id);
                                    }
                                }}
                                className="w-full py-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg transition-colors shadow-lg shadow-rose-500/30"
                            >
                                Xóa Chuyển
                            </button>
                        )}
                    </div>
                    
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                    >
                        Hủy
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default TransferFundsModal;
