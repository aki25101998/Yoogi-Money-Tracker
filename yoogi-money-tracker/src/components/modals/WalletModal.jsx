import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import AmountInput from '../ui/AmountInput';

const EMOJI_PICKS = ['💵', '💳', '🏦', '📱', '💰', '💼', '🐖'];

const WalletModal = ({ isOpen, onClose, mode = 'add', initialData = null, onSave, onDelete }) => {
const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('💵');
    const [initialBalance, setInitialBalance] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormName(initialData.name || '');
                setFormIcon(initialData.icon || '💵');
                setInitialBalance(initialData.initialBalance || 0);
            } else {
                setFormName('');
                setFormIcon('💵');
                setInitialBalance('');
            }
        }
    }, [isOpen, mode, initialData]);

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    if (!isOpen) return null;

    
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
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formName.trim()) return;
        onSave({ 
            name: formName.trim(), 
            icon: formIcon,
            initialBalance: Number(initialBalance) || 0
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                        {mode === 'add' ? 'Thêm Ví mới' : 'Sửa Ví'}
                    </h3>
                    <button type="button" onClick={onClose}>
                        <X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    </button>
                </div>
                <form onSubmit={safeSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Biểu tượng</label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_PICKS.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setFormIcon(emoji)}
                                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${formIcon === emoji ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-500 scale-110' : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên ví</label>
                        <input
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                            placeholder="Vd: Tiền mặt, Thẻ ATM..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Số dư ban đầu</label>
                        <AmountInput
                            value={initialBalance}
                            onChange={setInitialBalance}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                            placeholder="Vd: 500000"
                        />
                    </div>
                    <div className="flex gap-3 mt-2">
                        {mode === 'edit' && onDelete && initialData && (
                            <button 
                                type="button" 
                                onClick={() => onDelete(initialData.id)} 
                                className="py-3 px-4 bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-400 font-bold rounded-xl transition-colors"
                                title="Xóa ví"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors">
                            Lưu
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default WalletModal;
