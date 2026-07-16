import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Pencil, Trash2, ChevronDown, ChevronUp, X,
    GripVertical, AlertTriangle, Download
} from 'lucide-react';
import {
    addCategory, updateCategory, deleteCategory, updateCategoryOrder, applyDefaultCategories,
    getCategoryTemplates, saveCategoryTemplate, deleteCategoryTemplate, applyCategoryTemplate,
} from '../utils/supabaseHelpers';

import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import ConfirmModal from '../components/modals/ConfirmModal';


import SortableCategoryItem from '../components/categories/SortableCategoryItem';

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
    const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);

    const [localCategories, setLocalCategories] = useState([]);
    const initialCategoryIdRef = useRef(null);

    // Template state
    const [templates, setTemplates] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');

    useEffect(() => {
        if (user?.uid) {
            getCategoryTemplates(user.uid).then(setTemplates).catch(console.error);
        }
    }, [user]);

    const handleSaveTemplate = async () => {
        if(!templateName.trim()) return;
        try {
            await saveCategoryTemplate(user.uid, templateName, categories);
            alert('Lưu mẫu thành công!');
            setShowTemplateModal(false);
            setTemplateName('');
            const newTemplates = await getCategoryTemplates(user.uid);
            setTemplates(newTemplates);
        } catch(e) {
            alert('Lỗi: ' + e.message);
        }
    };

    const handleLoadTemplate = async (template) => {
        if (window.confirm(`Bạn có chắc muốn áp dụng mẫu "${template.name}"? Toàn bộ danh mục hiện tại sẽ bị xóa!`)) {
            setIsApplyingDefaults(true);
            try {
                await applyCategoryTemplate(user.uid, template.categories);
                alert('Áp dụng mẫu thành công!');
            } catch (e) {
                alert('Lỗi: ' + e.message);
            }
            setIsApplyingDefaults(false);
        }
    };
    
    const handleDeleteTemplate = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Bạn có chắc muốn xóa mẫu này?')) {
            try {
                await deleteCategoryTemplate(user.uid, id);
                const newTemplates = await getCategoryTemplates(user.uid);
                setTemplates(newTemplates);
            } catch (e) {
                alert('Lỗi: ' + e.message);
            }
        }
    };

    useEffect(() => {
        const sorted = [...categories.filter(c => c.type === activeTab)].sort((a, b) => {
            if (a.id.includes('uncategorized')) return 1;
            if (b.id.includes('uncategorized')) return -1;
            return (a.order || 0) - (b.order || 0);
        });
        setLocalCategories(sorted);
    }, [categories, activeTab]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => {
        const { active } = event;
        if (active.data.current?.type === 'subcategory') {
            initialCategoryIdRef.current = active.data.current.categoryId;
        }
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;
        
        if (activeType === 'subcategory') {
            const activeCategoryId = active.data.current?.categoryId;
            let overCategoryId = overType === 'category' ? over.id : over.data.current?.categoryId;

            if (overCategoryId && overCategoryId !== activeCategoryId) {
                setLocalCategories(prev => {
                    const activeCatIndex = prev.findIndex(c => c.id === activeCategoryId);
                    const overCatIndex = prev.findIndex(c => c.id === overCategoryId);
                    
                    if (activeCatIndex === -1 || overCatIndex === -1) return prev;
                    
                    const newCats = [...prev];
                    const activeCat = { ...newCats[activeCatIndex] };
                    const overCat = { ...newCats[overCatIndex] };
                    
                    const activeSubIndex = (activeCat.subcategories || []).findIndex(s => s.id === active.id);
                    if (activeSubIndex === -1) return prev;
                    
                    const activeSub = activeCat.subcategories[activeSubIndex];
                    activeCat.subcategories = (activeCat.subcategories || []).filter(s => s.id !== active.id);
                    
                    const newOverSubs = [...(overCat.subcategories || [])];
                    if (overType === 'category') {
                        newOverSubs.push(activeSub);
                    } else {
                        const overSubIndex = newOverSubs.findIndex(s => s.id === over.id);
                        if (overSubIndex !== -1) {
                            newOverSubs.splice(overSubIndex, 0, activeSub);
                        } else {
                            newOverSubs.push(activeSub);
                        }
                    }
                    
                    overCat.subcategories = newOverSubs;
                    newCats[activeCatIndex] = activeCat;
                    newCats[overCatIndex] = overCat;
                    
                    active.data.current.categoryId = overCategoryId;
                    return newCats;
                });
            }
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        const initialCategoryId = initialCategoryIdRef.current;
        initialCategoryIdRef.current = null;
        
        if (!over) return;
        
        const activeType = active.data.current?.type;
        
        if (activeType === 'category') {
            if (active.id !== over.id) {
                const oldIndex = localCategories.findIndex(c => c.id === active.id);
                const newIndex = localCategories.findIndex(c => c.id === over.id);
                
                if (localCategories[newIndex]?.id.includes('uncategorized') || localCategories[oldIndex]?.id.includes('uncategorized')) return;

                const newCategories = arrayMove(localCategories, oldIndex, newIndex);
                setLocalCategories(newCategories);
                
                try {
                    await updateCategoryOrder(user.uid, newCategories.filter(c => !c.id.includes('uncategorized')).map(c => c.id));
                } catch (error) {
                    console.error(error);
                    alert("Lỗi khi sắp xếp: " + error.message);
                }
            }
        } else if (activeType === 'subcategory') {
            const finalCategoryId = active.data.current?.categoryId;
            let finalLocalCats = [...localCategories];
            
            if (active.id !== over.id) {
                const overCategoryId = over.data.current?.type === 'category' ? over.id : over.data.current?.categoryId;
                
                if (finalCategoryId === overCategoryId) {
                    const catIndex = finalLocalCats.findIndex(c => c.id === finalCategoryId);
                    if (catIndex !== -1) {
                        const cat = { ...finalLocalCats[catIndex] };
                        const oldIndex = (cat.subcategories || []).findIndex(s => s.id === active.id);
                        const newIndex = (cat.subcategories || []).findIndex(s => s.id === over.id);
                        
                        if (oldIndex !== -1 && newIndex !== -1) {
                            cat.subcategories = arrayMove(cat.subcategories || [], oldIndex, newIndex);
                            finalLocalCats[catIndex] = cat;
                            setLocalCategories(finalLocalCats);
                        }
                    }
                }
            }

            try {
                const finalCat = finalLocalCats.find(c => c.id === finalCategoryId);
                
                if (initialCategoryId && initialCategoryId !== finalCategoryId) {
                    const initialCat = finalLocalCats.find(c => c.id === initialCategoryId);
                    if (initialCat && finalCat) {
                        await Promise.all([
                            updateCategory(user.uid, initialCategoryId, { subcategories: initialCat.subcategories || [] }),
                            updateCategory(user.uid, finalCategoryId, { subcategories: finalCat.subcategories || [] })
                        ]);
                    }
                } else if (finalCat && active.id !== over.id) {
                    await updateCategory(user.uid, finalCategoryId, { subcategories: finalCat.subcategories || [] });
                }
            } catch (error) {
                console.error(error);
                alert("Lỗi khi cập nhật danh mục: " + error.message);
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
                    const maxOrder = Math.max(...localCategories.map(c => c.order || 0), 0);
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

    const handleLoadDefaultCategories = async () => {
        if (!user || isApplyingDefaults) return;

        if (window.confirm("BẠN CÓ CHẮC CHẮN? Toàn bộ danh mục hiện tại của bạn sẽ bị XÓA và thay thế bằng danh mục mặc định chuẩn của Yoogi. Hành động này không thể hoàn tác!")) {
            setIsApplyingDefaults(true);
            try {
                const added = await applyDefaultCategories(user.uid);
                alert(`Đã tải thêm/cập nhật ${added} danh mục chuẩn.`);
            } catch (error) {
                alert('Lỗi tải danh mục: ' + error.message);
            }
            setIsApplyingDefaults(false);
        }
    };

    // Common emojis
    const EMOJI_PICKS = ['🏠', '🛍️', '🛒', '💼', '💳', '💸', '💎', '🌱', '🎁', '💪', '📈', '🤝', '❓', '🚗', '✈️', '💰', '📱', '🎮', '📚', '🎵', '🍜', '☕', '🍹', '🍿', '💊', '🏋️', '🎯'];

    return (
        <div className="space-y-6">
            {/* Header */}
            {!hideHeader && (
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Danh mục</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý danh mục thu chi 2 cấp</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <button
                                className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
                            >
                                Mẫu <ChevronDown className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col max-h-[60vh] overflow-y-auto">
    <button
        onClick={handleLoadDefaultCategories}
        disabled={isApplyingDefaults}
        className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 border-b border-slate-100 dark:border-slate-700"
    >
        <Download className="w-4 h-4" /> {isApplyingDefaults ? 'Đang tải...' : 'Tải mẫu Yoogi'}
    </button>
    {templates.map(t => (
        <div key={t.id} className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">
            <button
                onClick={() => handleLoadTemplate(t)}
                disabled={isApplyingDefaults}
                className="flex-1 text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium truncate"
            >
                {t.name}
            </button>
            <button onClick={(e) => handleDeleteTemplate(e, t.id)} className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    ))}
    <button
        onClick={() => setShowTemplateModal(true)}
        className="w-full text-left px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium transition-colors flex items-center gap-2"
    >
        <Plus className="w-4 h-4" /> Thêm mẫu mới
    </button>
</div>
                        </div>
                        <button
                            onClick={openAddCategory}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-4 h-4" /> Thêm danh mục
                        </button>
                    </div>
                </div>
            )}
            {hideHeader && (
                <div className="flex justify-end mb-2 gap-2">
                    <div className="relative group">
                        <button
                            className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
                        >
                            Mẫu <ChevronDown className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col max-h-[60vh] overflow-y-auto">
    <button
        onClick={handleLoadDefaultCategories}
        disabled={isApplyingDefaults}
        className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 border-b border-slate-100 dark:border-slate-700"
    >
        <Download className="w-4 h-4" /> {isApplyingDefaults ? 'Đang tải...' : 'Tải mẫu Yoogi'}
    </button>
    {templates.map(t => (
        <div key={t.id} className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">
            <button
                onClick={() => handleLoadTemplate(t)}
                disabled={isApplyingDefaults}
                className="flex-1 text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium truncate"
            >
                {t.name}
            </button>
            <button onClick={(e) => handleDeleteTemplate(e, t.id)} className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    ))}
    <button
        onClick={() => setShowTemplateModal(true)}
        className="w-full text-left px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium transition-colors flex items-center gap-2"
    >
        <Plus className="w-4 h-4" /> Thêm mẫu mới
    </button>
</div>
                    </div>
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
                {localCategories.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-slate-400 font-medium">Chưa có danh mục nào</p>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                        <SortableContext items={localCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {localCategories.map((cat, idx) => {
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

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white">Lưu mẫu danh mục</h3>
                            <button onClick={() => setShowTemplateModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên mẫu</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={e => setTemplateName(e.target.value)}
                                    placeholder="Ví dụ: Mẫu cơ bản, Mẫu chi tiết..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-slate-800 dark:text-white"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={!templateName.trim()}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 transition-all"
                            >
                                Lưu mẫu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
