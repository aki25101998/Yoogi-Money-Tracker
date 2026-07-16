import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

const SortableSubcategoryItem = ({ sub, catId, openEditSubcategory, confirmDeleteSubcategory }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ 
        id: sub.id,
        data: { type: 'subcategory', categoryId: catId, sub }
    });

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
                className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 p-1 -ml-2 touch-none"
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

export default SortableSubcategoryItem;
