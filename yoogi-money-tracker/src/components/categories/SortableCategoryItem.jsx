import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSubcategoryItem from './SortableSubcategoryItem';

const SortableCategoryItem = ({ cat, isExpanded, subCount, isUncategorized, toggleExpand, openEditCategory, confirmDeleteCategory, openAddSubcategory, openEditSubcategory, confirmDeleteSubcategory }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ 
        id: cat.id, 
        disabled: isUncategorized,
        data: { type: 'category', cat }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${isDragging ? 'shadow-xl border-emerald-500 scale-[1.01]' : ''}`}>
            {/* Category Header */}
            <div className={`flex items-center gap-3 px-4 py-4 transition-colors ${!isUncategorized ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30' : ''}`} onClick={() => !isUncategorized && toggleExpand(cat.id)}>
                {!isUncategorized && (
                    <div 
                        {...attributes} 
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 p-1 touch-none"
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

export default SortableCategoryItem;
