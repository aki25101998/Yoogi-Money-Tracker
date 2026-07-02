import React, { useState } from 'react';
import {
    Plus, Pencil, Trash2, ChevronDown, ChevronUp, X,
    GripVertical, AlertTriangle
} from 'lucide-react';
import {
    addCategory, updateCategory, deleteCategory, updateCategoryOrder
} from '../utils/firebaseHelpers';

import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import ConfirmModal from '../components/modals/ConfirmModal';

const SortableSubcategoryItem = ({ sub, catId, openEditSubcategory, confirmDeleteSubcategory }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: sub.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center gap-3 px-4 py-3 pl-12 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group ${isDragging ? 'bg-white dark:bg-slate-800 shadow-lg border border-emerald-500 rounded-lg relative z-10 scale-[1.01]' : ''}`}>
            <div 
                {...attributes} 
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 p-1 -ml-2"
            >
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-300 dark:bg-slate-600" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {sub.name}
                </p>
                {sub.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{sub.description}</p>
                )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditSubcategory(catId, sub)} className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => confirmDeleteSubcategory(catId, sub)} className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

const SortableCategoryItem = ({ cat, isExpanded, subCount, isUncategorized, toggleExpand, openEditCategory, confirmDeleteCategory, openAddSubcategory, openEditSubcategory, confirmDeleteSubcategory, onSubDragEnd }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: cat.id, disabled: isUncategorized });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <div ref={setNodeRef} style={style} className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${isDragging ? 'shadow-xl border-emerald-500 scale-[1.01]' : ''}`}>
            {/* Category Header */}
            <div className={`flex items-center gap-3 px-4 py-4 transition-colors ${!isUncategorized ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30' : ''}`} onClick={() => !isUncategorized && toggleExpand(cat.id)}>
                {!isUncategorized && (
                    <div 
                        {...attributes} 
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 p-1"
                    >
                        <GripVertical className="w-5 h-5" />
                    </div>
                )}
                {isUncategorized && <div className="w-7"></div>}
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-white text-base">{cat.name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{subCount} danh mục phụ</p>
                </div>
                <div className="flex items-center gap-1">
                    {!isUncategorized && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); confirmDeleteCategory(cat); }} className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Subcategories */}
            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={(e) => onSubDragEnd(e, cat)}>
                        <SortableContext items={(cat.subcategories || []).map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {(cat.subcategories || []).map(sub => (
                                    <SortableSubcategoryItem 
                                        key={sub.id} 
                                        sub={sub} 
                                        catId={cat.id}
                                        openEditSubcategory={openEditSubcategory}
                                        confirmDeleteSubcategory={confirmDeleteSubcategory}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Add Subcategory Button */}
                    {!isUncategorized && (
                        <button
                            onClick={() => openAddSubcategory(cat.id)}
                            className="w-full py-3 px-4 pl-12 text-left text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-700"
                        >
                            <Plus className="w-3.5 h-3.5" /> Thêm danh mục phụ
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const CategoriesPage = ({ user, categories, hideHeader = false }) => {
    const [activeTab, setActiveTab] = useState('expense'); // 'expense' | 'income'
    const [expandedCats, setExpandedCats] = useState({});

    // Modal states
    const [editModal, setEditModal] = useState({ isOpen: false, mode: 'add', level: 'category', parentCatId: null, data: null });
    const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('');
    const [formDescription, setFormDescription] = useState('');

    // Delete confirm
    const [confirmState, setConfirmState] = useState({ isOpen: false, data: null, type: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredCategories = categories.filter(c => c.type === activeTab);
    
    // Sort filtered categories by order
    filteredCategories.sort((a, b) => {
        if (a.id.includes('uncategorized')) return 1;
        if (b.id.includes('uncategorized')) return -1;
        return (a.order || 0) - (b.order || 0);
    });

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = filteredCategories.findIndex(c => c.id === active.id);
            const newIndex = filteredCategories.findIndex(c => c.id === over.id);
            
            if (filteredCategories[newIndex]?.id.includes('uncategorized') || filteredCategories[oldIndex]?.id.includes('uncategorized')) return;

            const newCategories = arrayMove(filteredCategories, oldIndex, newIndex);
            
            try {
                await updateCategoryOrder(user.uid, newCategories.filter(c => !c.id.includes('uncategorized')).map(c => c.id));
            } catch (error) {
                console.error(error);
                alert("Lỗi khi sắp xếp: " + error.message);
            }
        }
    };

    const handleSubDragEnd = async (event, parentCat) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = (parentCat.subcategories || []).findIndex(s => s.id === active.id);
            const newIndex = (parentCat.subcategories || []).findIndex(s => s.id === over.id);
            const newSubs = arrayMove(parentCat.subcategories || [], oldIndex, newIndex);
            
            try {
                await updateCategory(user.uid, parentCat.id, { subcategories: newSubs });
            } catch (error) {
                console.error(error);
                alert("Lỗi khi sắp xếp: " + error.message);
            }
        }
    };

    const toggleExpand = (catId) => {
        setExpandedCats(prev => {
            const isCurrentlyExpanded = prev[catId] !== false;
            return { ...prev, [catId]: !isCurrentlyExpanded };
        });
    };

    // --- Add/Edit Category (Level 1) ---
    const openAddCategory = () => {
        setEditModal({ isOpen: true, mode: 'add', level: 'category', parentCatId: null, data: null });
        setFormName('');
        setFormIcon('📁');
        setFormDescription('');
    };

    const openEditCategory = (cat) => {
        setEditModal({ isOpen: true, mode: 'edit', level: 'category', parentCatId: null, data: cat });
        setFormName(cat.name);
        setFormIcon(cat.icon);
        setFormDescription('');
    };

    // --- Add/Edit Subcategory (Level 2) ---
    const openAddSubcategory = (catId) => {
        setEditModal({ isOpen: true, mode: 'add', level: 'subcategory', parentCatId: catId, data: null });
        setFormName('');
        setFormIcon('');
        setFormDescription('');
    };

    const openEditSubcategory = (catId, sub) => {
        setEditModal({ isOpen: true, mode: 'edit', level: 'subcategory', parentCatId: catId, data: sub });
        setFormName(sub.name);
        setFormIcon('');
        setFormDescription(sub.description || '');
    };

    const closeModal = () => {
        setEditModal({ isOpen: false, mode: 'add', level: 'category', parentCatId: null, data: null });
    };

    // --- Save ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !formName.trim()) return;

        try {
            if (editModal.level === 'category') {
                if (editModal.mode === 'add') {
                    // Add new category
                    const maxOrder = Math.max(...filteredCategories.map(c => c.order || 0), 0);
                    await addCategory(user.uid, {
                        name: formName.trim(),
                        icon: formIcon || '📁',
                        type: activeTab,
                        order: maxOrder + 1,
                        subcategories: [],
                    });
                } else {
                    // Edit existing category
                    await updateCategory(user.uid, editModal.data.id, {
                        name: formName.trim(),
                        icon: formIcon || editModal.data.icon,
                    });
                }
            } else {
                // Subcategory
                const parentCat = categories.find(c => c.id === editModal.parentCatId);
                if (!parentCat) return;

                let newSubs = [...(parentCat.subcategories || [])];

                if (editModal.mode === 'add') {
                    const newId = formName.trim().toLowerCase().replace(/[^a-z0-9_\u00C0-\u024F]/gi, '_').replace(/_+/g, '_');
                    newSubs.push({
                        id: newId + '_' + Date.now(),
                        name: formName.trim(),
                        description: formDescription.trim(),
                    });
                } else {
                    newSubs = newSubs.map(s =>
                        s.id === editModal.data.id
                            ? { ...s, name: formName.trim(), description: formDescription.trim() }
                            : s
                    );
                }

                await updateCategory(user.uid, editModal.parentCatId, {
                    subcategories: newSubs,
                });
            }
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }

        closeModal();
    };

    // --- Delete ---
    const confirmDeleteCategory = (cat) => {
        setConfirmState({ isOpen: true, data: cat, type: 'category' });
    };

    const confirmDeleteSubcategory = (catId, sub) => {
        setConfirmState({ isOpen: true, data: { catId, sub }, type: 'subcategory' });
    };

    const handleDelete = async () => {
        if (!user) return;
        setIsDeleting(true);
        try {
            if (confirmState.type === 'category') {
                await deleteCategory(user.uid, confirmState.data.id);
            } else {
                const parentCat = categories.find(c => c.id === confirmState.data.catId);
                if (parentCat) {
                    const newSubs = (parentCat.subcategories || []).filter(s => s.id !== confirmState.data.sub.id);
                    await updateCategory(user.uid, confirmState.data.catId, { subcategories: newSubs });
                }
            }
        } catch (err) {
            alert('Lỗi xóa: ' + err.message);
        }
        setIsDeleting(false);
        setConfirmState({ isOpen: false, data: null, type: null });
    };

    // Common emojis
    const EMOJI_PICKS = ['🏠', '🛍️', '💼', '🌱', '🎁', '💪', '📈', '🤝', '❓', '🚗', '🎮', '📚', '🍜', '💊', '✈️', '💰', '📱', '🎵', '🏋️', '🎯'];

    return (
        <div className="space-y-6">
            {/* Header */}
            {!hideHeader && (
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Danh mục</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý danh mục thu chi 2 cấp</p>
                    </div>
                    <button
                        onClick={openAddCategory}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> Thêm danh mục
                    </button>
                </div>
            )}
            {hideHeader && (
                <div className="flex justify-end mb-2">
                    <button
                        onClick={openAddCategory}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Thêm danh mục
                    </button>
                </div>
            )}

            {/* Tab: Expense / Income */}
            <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'expense' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    Chi tiêu ({categories.filter(c => c.type === 'expense').length})
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    Thu nhập ({categories.filter(c => c.type === 'income').length})
                </button>
            </div>

            {/* Categories List */}
            <div className="space-y-3">
                {filteredCategories.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-slate-400 font-medium">Chưa có danh mục nào</p>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {filteredCategories.map((cat, idx) => {
                                const isExpanded = expandedCats[cat.id] !== false; // Default expanded
                                const subCount = cat.subcategories?.length || 0;
                                const isUncategorized = cat.id === 'uncategorized_expense' || cat.id === 'uncategorized_income' || cat.name === 'Chưa phân loại' || cat.name === '❓ Chưa phân loại';

                                return (
                                    <SortableCategoryItem
                                        key={cat.id}
                                        cat={cat}
                                        isExpanded={isExpanded}
                                        subCount={subCount}
                                        isUncategorized={isUncategorized}
                                        toggleExpand={toggleExpand}
                                        openEditCategory={openEditCategory}
                                        confirmDeleteCategory={confirmDeleteCategory}
                                        openAddSubcategory={openAddSubcategory}
                                        openEditSubcategory={openEditSubcategory}
                                        confirmDeleteSubcategory={confirmDeleteSubcategory}
                                        onSubDragEnd={handleSubDragEnd}
                                    />
                                );
                            })}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Add/Edit Modal */}
            {editModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editModal.mode === 'add' ? 'Thêm' : 'Sửa'} {editModal.level === 'category' ? 'danh mục chính' : 'danh mục phụ'}
                            </h3>
                            <button onClick={closeModal}><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {/* Icon picker (only for category) */}
                            {editModal.level === 'category' && (
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
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                                    placeholder={editModal.level === 'category' ? 'Vd: Nhu cầu thiết yếu' : 'Vd: Ăn uống cơ bản'}
                                />
                            </div>

                            {editModal.level === 'subcategory' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Mô tả (tùy chọn)</label>
                                    <input
                                        type="text"
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                                        placeholder="Vd: Siêu thị, đi chợ"
                                    />
                                </div>
                            )}

                            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-2 shadow-lg shadow-emerald-200 dark:shadow-none">
                                {editModal.mode === 'add' ? 'Thêm' : 'Cập nhật'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ isOpen: false, data: null, type: null })}
                onConfirm={handleDelete}
                title={`Xóa ${confirmState.type === 'category' ? 'danh mục chính' : 'danh mục phụ'}?`}
                description={`Bạn có chắc muốn xóa ${confirmState.type === 'category' ? 'danh mục chính này và tất cả danh mục phụ' : 'danh mục phụ này'} không?`}
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

export default CategoriesPage;
