import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Brain, Plus, Pencil, Trash2, X, AlertTriangle,
    Sparkles, User as UserIcon, Zap, ChevronDown
} from 'lucide-react';
import {
    addAIMemory, updateAIMemory, deleteAIMemory
} from '../utils/firebaseHelpers';
import ConfirmModal from '../components/modals/ConfirmModal';

const AINotesPage = ({ user, aiMemories, categories, hideHeader = false }) => {
    // Modal
    const [editModal, setEditModal] = useState({ isOpen: false, mode: 'add', data: null });
    const [formKeyword, setFormKeyword] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formSubcategoryId, setFormSubcategoryId] = useState('');

    // Delete
    const [confirmState, setConfirmState] = useState({ isOpen: false, data: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter
    const [filterSource, setFilterSource] = useState('all'); // 'all' | 'auto' | 'user'
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMemories = aiMemories.filter(m => {
        if (filterSource !== 'all' && m.source !== filterSource) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            if (!m.keyword.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    // --- Open/Close Modal ---
    const openAdd = () => {
        setEditModal({ isOpen: true, mode: 'add', data: null });
        setFormKeyword('');
        setFormCategoryId('');
        setFormSubcategoryId('');
    };

    const openEdit = (mem) => {
        setEditModal({ isOpen: true, mode: 'edit', data: mem });
        setFormKeyword(mem.keyword);
        setFormCategoryId(mem.categoryId);
        setFormSubcategoryId(mem.subcategoryId);
    };

    const closeModal = () => {
        setEditModal({ isOpen: false, mode: 'add', data: null });
    };

    // --- Save ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !formKeyword.trim() || !formCategoryId) return;

        try {
            if (editModal.mode === 'add') {
                await addAIMemory(user.uid, {
                    keyword: formKeyword.trim().toLowerCase(),
                    categoryId: formCategoryId,
                    subcategoryId: formSubcategoryId,
                    source: 'user',
                });
            } else {
                await updateAIMemory(user.uid, editModal.data.id, {
                    keyword: formKeyword.trim().toLowerCase(),
                    categoryId: formCategoryId,
                    subcategoryId: formSubcategoryId,
                });
            }
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
        closeModal();
    };

    // --- Delete ---
    const handleDelete = async () => {
        if (!user || !confirmState.data) return;
        setIsDeleting(true);
        try {
            await deleteAIMemory(user.uid, confirmState.data);
        } catch (err) {
            alert('Lỗi xóa: ' + err.message);
        }
        setIsDeleting(false);
        setConfirmState({ isOpen: false, data: null });
    };

    const getCategoryLabel = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat ? `${cat.icon} ${cat.name}` : '❓ Unknown';
    };

    const getSubcategoryLabel = (categoryId, subcategoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        const sub = cat?.subcategories?.find(s => s.id === subcategoryId);
        return sub ? sub.name : '';
    };

    const getSubcategories = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat?.subcategories || [];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            {!hideHeader && (
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Brain className="w-6 h-6 text-purple-500" />
                            Ví ngữ cảnh
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Bộ nhớ học của AI — giúp AI phân loại giao dịch chính xác hơn
                        </p>
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-200 dark:shadow-none transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> Thêm ngữ cảnh
                    </button>
                </div>
            )}
            {hideHeader && (
                <div className="flex justify-end mb-2">
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Thêm ngữ cảnh
                    </button>
                </div>
            )}

            {/* Explainer */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5 border border-purple-100 dark:border-purple-800/30">
                <h4 className="text-sm font-bold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI hoạt động như thế nào?
                </h4>
                <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1.5 leading-relaxed">
                    <p>🔍 Khi bạn nhập giao dịch, AI sẽ <strong>kiểm tra ghi chú này trước</strong> để phân loại.</p>
                    <p>🧠 Khi bạn <strong>sửa danh mục</strong> của một giao dịch, AI sẽ <strong>tự động học</strong> và tạo ghi chú mới.</p>
                    <p>✏️ Bạn cũng có thể <strong>ghi chú thủ công</strong> để dạy AI phân loại đúng từ đầu.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 items-center flex-wrap">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm từ khóa..."
                    className="flex-1 min-w-[150px] px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-800 dark:text-white"
                />
                <div className="flex gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    {[
                        { value: 'all', label: 'Tất cả' },
                        { value: 'auto', label: '🧠 AI tự học', icon: Zap },
                        { value: 'user', label: '✏️ User ghi', icon: UserIcon },
                    ].map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilterSource(opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSource === opt.value ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{aiMemories.length}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng ghi chú</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{aiMemories.filter(m => m.source === 'auto').length}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI tự học</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{aiMemories.filter(m => m.source === 'user').length}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">User ghi</p>
                </div>
            </div>

            {/* Memory List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {filteredMemories.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-3">🧠</div>
                        <p className="text-slate-400 font-medium">Chưa có ghi chú nào</p>
                        <p className="text-xs text-slate-400 mt-1">AI sẽ tự động học khi bạn sửa danh mục giao dịch</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {filteredMemories.map(mem => (
                            <div key={mem.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mem.source === 'auto' ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                                    {mem.source === 'auto' ? <Zap className="w-5 h-5 text-purple-500" /> : <UserIcon className="w-5 h-5 text-emerald-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">"{mem.keyword}"</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                        → {getCategoryLabel(mem.categoryId)} {getSubcategoryLabel(mem.categoryId, mem.subcategoryId) ? `> ${getSubcategoryLabel(mem.categoryId, mem.subcategoryId)}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                        {mem.usageCount || 0} lần
                                    </span>
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(mem)} className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setConfirmState({ isOpen: true, data: mem.id })} className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {editModal.isOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editModal.mode === 'add' ? 'Thêm ngữ cảnh mới' : 'Sửa ngữ cảnh'}
                            </h3>
                            <button onClick={closeModal}><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Danh mục</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={formCategoryId}
                                        onChange={(e) => { setFormCategoryId(e.target.value); setFormSubcategoryId(''); }}
                                        className="w-full px-4 pr-10 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Chọn danh mục...</option>
                                        <optgroup label="Chi tiêu">
                                            {categories.filter(c => c.type === 'expense').map(c => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Thu nhập">
                                            {categories.filter(c => c.type === 'income').map(c => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {formCategoryId && getSubcategories(formCategoryId).length > 0 && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Danh mục con</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formSubcategoryId}
                                            onChange={(e) => setFormSubcategoryId(e.target.value)}
                                            className="w-full px-4 pr-10 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-purple-500 focus:outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Chọn mục con...</option>
                                            {getSubcategories(formCategoryId).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {formCategoryId && (getSubcategories(formCategoryId).length === 0 || formSubcategoryId) && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Từ khóa</label>
                                    <input
                                        type="text"
                                        required
                                        value={formKeyword}
                                        onChange={(e) => setFormKeyword(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-purple-500 focus:outline-none"
                                        placeholder="Vd: ăn sáng, grab, shopee..."
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Khi giao dịch chứa từ khóa này, AI sẽ tự phân loại</p>
                                </div>
                            )}

                            <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl mt-2 shadow-lg shadow-purple-200 dark:shadow-none">
                                {editModal.mode === 'add' ? 'Thêm ghi chú' : 'Cập nhật'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ isOpen: false, data: null })}
                onConfirm={handleDelete}
                title="Xóa ngữ cảnh AI?"
                description="AI sẽ không còn dùng rule này để phân loại nữa."
                confirmText="Xóa"
                confirmVariant="danger"
                isProcessing={isDeleting}
                Icon={AlertTriangle}
                iconColorClass="text-rose-600"
                iconBgClass="bg-rose-100"
            />
        </div>
    );
};

export default AINotesPage;
