import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, ChevronDown } from 'lucide-react';
import { parseLoanInfo } from '../../utils/aiService';

const AddEditModal = ({
    isOpen,
    onClose,
    onSave,
    editingItem,
    uniqueOwners,
    onAddPayer,
    lenders,
    onAddLender
}) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        term: 6,
        rate: 0,
        startDate: new Date().toISOString().split('T')[0],
        owner: 'Tôi',
        lender: '',
        paidMonths: []
    });

    const [aiPrompt, setAiPrompt] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (editingItem) {
            setFormData({
                name: editingItem.name,
                amount: editingItem.originalAmount,
                term: editingItem.term,
                rate: editingItem.rate,
                startDate: editingItem.startDate,
                owner: editingItem.owner || 'Tôi',
                lender: editingItem.lender || '',
                paidMonths: editingItem.paidMonths || []
            });
            setAiPrompt('');
        } else {
            setFormData({
                name: '',
                amount: '',
                term: 6,
                rate: 0,
                startDate: new Date().toISOString().split('T')[0],
                owner: 'Tôi',
                lender: '',
                paidMonths: []
            });
            setAiPrompt('');
        }
    }, [editingItem, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleAiAnalyze = async () => {
        if (!aiPrompt.trim()) return;

        setIsAnalyzing(true);
        try {
            const result = await parseLoanInfo(aiPrompt);
            if (result) {
                setFormData(prev => ({
                    ...prev,
                    name: result.name || prev.name,
                    amount: result.amount || prev.amount,
                    term: result.term || prev.term,
                    rate: result.rate !== undefined ? result.rate : prev.rate,
                    startDate: result.startDate || prev.startDate,
                    owner: result.owner || prev.owner
                }));
            }
        } catch (error) {
            console.error(error);
            alert(`Lỗi AI: ${error.message}. Vui lòng thử lại hoặc kiểm tra Key trong file .env!`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- Helper to Generate Month List ---
    const getMonthsList = (startDateStr, term) => {
        if (!startDateStr || !term) return [];
        const [y, m, d] = startDateStr.split('-').map(Number);
        const list = [];
        let current = new Date(y, m - 1, 1);

        for (let i = 0; i < term; i++) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            list.push(`${year}-${month}`);
            current.setMonth(current.getMonth() + 1);
        }
        return list;
    };

    const toggleMonth = (monthStr) => {
        const currentPaid = formData.paidMonths || [];
        let newPaid;
        if (currentPaid.includes(monthStr)) {
            newPaid = currentPaid.filter(m => m !== monthStr);
        } else {
            newPaid = [...currentPaid, monthStr];
        }
        setFormData({ ...formData, paidMonths: newPaid });
    };

    const monthList = getMonthsList(formData.startDate, formData.term);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingItem ? "Cập nhật" : "Thêm mới"}</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* ... (Existing Inputs) ... */}

                    {/* AI Section - Hide if editing */}
                    {!editingItem && (
                        <div className="mb-2 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">
                            <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Nhập nhanh bằng AI
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-2 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                    placeholder="Vd: Vay 10 triệu trong 12 tháng trả tiền nhà..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAiAnalyze();
                                        }
                                    }}
                                />
                                <button type="button" onClick={handleAiAnalyze} disabled={isAnalyzing || !aiPrompt.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 min-w-[80px] flex justify-center items-center">
                                    {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Điền"}
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Người trả</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <select
                                    required
                                    className="w-full h-full px-4 py-2 pr-10 appearance-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none cursor-pointer"
                                    value={formData.owner}
                                    onChange={e => setFormData({ ...formData, owner: e.target.value })}
                                >
                                    <option value="">Chọn người trả...</option>
                                    {uniqueOwners && uniqueOwners.map(o => (
                                        <option key={o.id} value={o.name}>{o.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (onAddPayer) {
                                        const newPayer = await onAddPayer();
                                        if (newPayer) {
                                            setFormData({ ...formData, owner: newPayer });
                                        }
                                    }
                                }}
                                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors flex items-center justify-center"
                                title="Thêm người trả mới"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Đơn vị cho vay</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <select
                                    className="w-full h-full px-4 py-2 pr-10 appearance-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none cursor-pointer"
                                    value={formData.lender}
                                    onChange={e => setFormData({ ...formData, lender: e.target.value })}
                                >
                                    <option value="">Khác (Không xác định)</option>
                                    {lenders && lenders.map(l => (
                                        <option key={l.id} value={l.name}>{l.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (onAddLender) {
                                        const newLender = await onAddLender();
                                        if (newLender) {
                                            setFormData({ ...formData, lender: newLender });
                                        }
                                    }
                                }}
                                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors flex items-center justify-center"
                                title="Thêm đơn vị mới"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên món đồ</label>
                        <input type="text" required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Số tiền vay (Gốc)</label>
                        <input type="number" required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Số tháng</label>
                            <input type="number" required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none" value={formData.term} onChange={e => setFormData({ ...formData, term: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Lãi suất % (Tháng)</label>
                            <input type="number" step="0.01" className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none" value={formData.rate} onChange={e => setFormData({ ...formData, rate: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày bắt đầu</label>
                        <input type="date" required className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                    </div>

                    {/* NEW: Payment Grid Section */}
                    {editingItem && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                Lịch sử & Đánh dấu thanh toán
                            </label>
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                {monthList.map(month => {
                                    const isPaid = formData.paidMonths?.includes(month);
                                    return (
                                        <button
                                            key={month}
                                            type="button"
                                            onClick={() => toggleMonth(month)}
                                            className={`
                                                relative px-2 py-2 text-xs font-bold rounded-lg border text-center transition-all
                                                ${isPaid
                                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}
                                            `}
                                        >
                                            {month.split('-').reverse().join('/')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl mt-2 shadow-lg shadow-indigo-200 dark:shadow-none">Lưu lại</button>
                </form>
            </div>
        </div>
    );
};

export default AddEditModal;
