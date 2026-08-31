import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDownRight, ArrowUpRight, Check, Trash2, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import AmountInput from '../ui/AmountInput';

const TransactionModal = ({ isOpen, onClose, onSave, onDelete, categories, wallets, initialData = null, defaultWalletId = null }) => {
const defaultWallet = defaultWalletId || wallets?.find(w => w.isDefault)?.id || wallets?.[0]?.id || '';
    
    const getCurrentTime = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const [form, setForm] = useState({
        type: 'expense',
        amount: '',
        description: '',
        personName: '', // added to store extracted person name for debts
        categoryId: '',
        subcategoryId: '',
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
        time: getCurrentTime(),
        walletId: defaultWallet,
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                let parsedDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                let parsedTime = initialData.time || (initialData.createdAt ? new Date(initialData.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : getCurrentTime());

                if (initialData.date) {
                    if (initialData.date.includes('T')) {
                        // It's an ISO string
                        const d = new Date(initialData.date);
                        parsedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                        parsedTime = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    } else {
                        // It's just a date string 'yyyy-mm-dd'
                        parsedDate = initialData.date;
                    }
                }

                let parsedDesc = initialData.description || initialData.note || '';
                let pName = '';
                let cleanNote = parsedDesc;

                if (initialData.type === 'loan_given') {
                    const match = parsedDesc.match(/^(.*?) mượn(?:[:\s]+(.*))?$/i);
                    if (match) {
                        pName = match[1]?.trim() || '';
                        cleanNote = match[2]?.trim() || '';
                    }
                } else if (initialData.type === 'loan_repaid') {
                    const match = parsedDesc.match(/^(.*?) trả nợ(?:[:\s]+(.*))?$/i);
                    if (match) {
                        pName = match[1]?.trim() || '';
                        cleanNote = match[2]?.trim() || '';
                    }
                }

                setForm({
                    type: initialData.type || 'expense',
                    amount: initialData.amount || '',
                    description: cleanNote,
                    personName: pName,
                    categoryId: initialData.categoryId || '',
                    subcategoryId: initialData.subcategoryId || '',
                    date: parsedDate,
                    time: parsedTime,
                    walletId: initialData.walletId || defaultWallet,
                });
            } else {
                setForm({
                    type: 'expense',
                    amount: '',
                    description: '',
                    personName: '',
                    categoryId: '',
                    subcategoryId: '',
                    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
                    time: getCurrentTime(),
                    walletId: defaultWallet,
                });
            }
        }
    }, [isOpen, initialData, defaultWallet]);

    if (!isOpen) return null;

    
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
    const handleSubmit = (e) => {
        e.preventDefault();
        
        let combinedDate = form.date;
        try {
            // Create a proper date object using local time
            const d = new Date();
            const [year, month, day] = form.date.split('-');
            const [hours, minutes] = form.time.split(':');
            d.setFullYear(year, month - 1, day);
            d.setHours(hours, minutes, 0, 0);
            combinedDate = d.toISOString();
        } catch (err) {
            console.error('Error combining date', err);
        }

        let finalDescription = form.description;
        if (form.type === 'loan_given') {
            finalDescription = form.personName ? `${form.personName} mượn${form.description ? ': ' + form.description : ''}` : form.description;
        } else if (form.type === 'loan_repaid') {
            finalDescription = form.personName ? `${form.personName} trả nợ${form.description ? ': ' + form.description : ''}` : form.description;
        }

        onSave({
            ...form,
            description: finalDescription,
            date: combinedDate,
            amount: parseFloat(form.amount) || 0,
        });
    };

    const getCategoriesByType = (type) => categories.filter(c => c.type === type);
    const getSubcategories = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.subcategories || [];
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                        {form.type === 'loan_given' ? 'Chỉnh sửa khoản nợ' : form.type === 'loan_repaid' ? 'Sửa lịch sử trả' : (initialData && initialData.id ? 'Sửa giao dịch' : 'Thêm giao dịch')}
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>
                <form onSubmit={safeSubmit} className="p-6 space-y-4">
                    {/* Type Toggle */}
                    {form.type === 'expense' || form.type === 'income' ? (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, type: 'expense', categoryId: '', subcategoryId: '' })}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${form.type === 'expense' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-2 border-rose-300 dark:border-rose-700' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                            >
                                <ArrowDownRight className="w-4 h-4 inline mr-1" /> Chi tiêu
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, type: 'income', categoryId: '', subcategoryId: '' })}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${form.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-700' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-transparent'}`}
                            >
                                <ArrowUpRight className="w-4 h-4 inline mr-1" /> Thu nhập
                            </button>
                        </div>
                    ) : null}

                    {form.type !== 'loan_given' && form.type !== 'loan_repaid' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Mô tả</label>
                            <input type="text" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {form.type === 'loan_given' ? 'Số tiền mượn' : form.type === 'loan_repaid' ? 'Số tiền đã trả' : 'Số tiền'}
                        </label>
                        <AmountInput
                            required
                            value={form.amount}
                            onChange={(value) => setForm({ ...form, amount: value })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {form.type === 'loan_given' ? 'Ngày mượn' : form.type === 'loan_repaid' ? 'Ngày trả' : 'Ngày & Giờ'}
                        </label>
                        <div className="flex gap-2">
                            <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none" />
                            
                            {form.type !== 'loan_given' && form.type !== 'loan_repaid' && (
                                <div className="relative">
                                    <input 
                                        type="time" 
                                        value={form.time} 
                                        onChange={e => setForm({ ...form, time: e.target.value })} 
                                        className="w-[120px] px-3 py-2 pl-9 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none text-sm" 
                                    />
                                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {form.type === 'loan_given' ? 'Trích từ ví' : form.type === 'loan_repaid' ? 'Vào ví' : 'Ví tiền'}
                        </label>
                        <div className="relative">
                            <select
                                required
                                value={form.walletId}
                                onChange={e => setForm({ ...form, walletId: e.target.value })}
                                className="w-full pl-4 pr-10 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none appearance-none"
                            >
                                <option value="">Chọn ví...</option>
                                {wallets?.map(w => (
                                    <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {(form.type === 'loan_given' || form.type === 'loan_repaid') && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
                            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none" />
                        </div>
                    )}

                    {(form.type === 'expense' || form.type === 'income') && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Danh mục</label>
                                <div className="relative">
                                    <select
                                        value={form.categoryId}
                                        onChange={e => setForm({ ...form, categoryId: e.target.value, subcategoryId: '' })}
                                        className="w-full pl-4 pr-10 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">Chọn danh mục...</option>
                                        {getCategoriesByType(form.type).map(c => (
                                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {form.categoryId && getSubcategories(form.categoryId).length > 0 && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Danh mục phụ</label>
                                    <div className="relative">
                                        <select
                                            value={form.subcategoryId}
                                            onChange={e => setForm({ ...form, subcategoryId: e.target.value })}
                                            className="w-full pl-4 pr-10 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none appearance-none"
                                        >
                                            <option value="">Chọn danh mục phụ...</option>
                                            {getSubcategories(form.categoryId).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex gap-3 pt-2">
                        {initialData && initialData.id && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
                                        onDelete(initialData.id);
                                    }
                                }}
                                className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-5 h-5" />
                                Xóa
                            </button>
                        )}
                        <button type="submit" className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all flex items-center justify-center gap-2">
                            <Check className="w-5 h-5" />
                            {initialData && initialData.id ? 'Lưu thay đổi' : 'Lưu giao dịch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default TransactionModal;
