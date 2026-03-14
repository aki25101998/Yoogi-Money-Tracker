import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { parseLoanInfo } from '../../utils/aiService';

const AddEditModal = ({
    isOpen,
    onClose,
    onSave,
    editingItem,
    uniqueOwners
}) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        term: 6,
        rate: 0,
        startDate: new Date().toISOString().split('T')[0],
        owner: 'Tôi',
    });

    // AI States
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
                owner: editingItem.owner || 'Tôi'
            });
            setAiPrompt('');
        } else {
            setFormData({
                name: '',
                amount: '',
                term: 6,
                rate: 0,
                startDate: new Date().toISOString().split('T')[0],
                owner: 'Tôi'
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

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingItem ? "Cập nhật" : "Thêm mới"}</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* KHU VỰC AI */}
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
                                    // Bắt sự kiện Enter để chạy AI luôn, tránh submit form nhầm
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAiAnalyze();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAiAnalyze}
                                    disabled={isAnalyzing || !aiPrompt.trim()}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 min-w-[80px] flex justify-center items-center"
                                >
                                    {isAnalyzing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "Điền"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Người trả</label>
                        <input
                            type="text"
                            list="owners"
                            required
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                            value={formData.owner}
                            onChange={e => setFormData({ ...formData, owner: e.target.value })}
                        />
                        <datalist id="owners">
                            {uniqueOwners.filter(o => o !== 'all').map(o => <option key={o} value={o} />)}
                            <option value="Tôi" /><option value="Vợ" /><option value="Chồng" />
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên món đồ</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Số tiền vay (Gốc)</label>
                        <input
                            type="number"
                            required
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Số tháng</label>
                            <input
                                type="number"
                                required
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                                value={formData.term}
                                onChange={e => setFormData({ ...formData, term: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Lãi suất % (Tháng)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                                value={formData.rate}
                                onChange={e => setFormData({ ...formData, rate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Ngày bắt đầu</label>
                        <input
                            type="date"
                            required
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl mt-2 shadow-lg shadow-indigo-200 dark:shadow-none">Lưu lại</button>
                </form>
            </div>
        </div>
    );
};

export default AddEditModal;
