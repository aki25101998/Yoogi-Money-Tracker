import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, PiggyBank, Receipt, Check } from 'lucide-react';

const TransferFundsModal = ({ isOpen, onClose, wallets, onSave }) => {
    const [transferType, setTransferType] = useState('transfer'); // transfer, savings, debt
    const [fromWallet, setFromWallet] = useState('');
    const [toWallet, setToWallet] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen && wallets?.length > 0) {
            setFromWallet(wallets[0]?.id);
            setToWallet(wallets.length > 1 ? wallets[1]?.id : wallets[0]?.id);
        }
    }, [isOpen, wallets]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            transferType,
            fromWallet,
            toWallet,
            description,
            amount: parseFloat(amount) || 0,
            date
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <div className="flex flex-col items-center w-full relative">
                        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-4"></div>
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                            Di chuyển Quỹ
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Chuyển tiền đến ví khác</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
                    {/* Types */}
                    <div className="flex gap-2 justify-center">
                        <button
                            type="button"
                            onClick={() => setTransferType('transfer')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${transferType === 'transfer' ? 'bg-teal-500 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                        >
                            <ArrowRightLeft className="w-4 h-4" /> Chuyển khoản
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransferType('savings')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${transferType === 'savings' ? 'bg-teal-500 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                        >
                            <PiggyBank className="w-4 h-4" /> Tiết kiệm
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransferType('debt')}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${transferType === 'debt' ? 'bg-teal-500 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                        >
                            <Receipt className="w-4 h-4" /> Món nợ
                        </button>
                    </div>

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

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg transition-colors shadow-lg shadow-teal-500/30"
                    >
                        Lưu
                    </button>
                    
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
