import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCurrency } from '../../utils/formatters';

const SortableWalletCard = ({ w, isSelected, onClick, onClickEdit, onLongPress }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: w.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const [startLongPress, setStartLongPress] = useState(false);
    useEffect(() => {
        let timerId;
        if (startLongPress) {
            timerId = setTimeout(() => {
                setStartLongPress(false);
                if (onLongPress) onLongPress();
            }, 500);
        } else {
            clearTimeout(timerId);
        }
        return () => clearTimeout(timerId);
    }, [startLongPress, onLongPress]);

    const longPressProps = {
        onTouchStart: () => setStartLongPress(true),
        onTouchEnd: () => setStartLongPress(false),
        onTouchMove: () => setStartLongPress(false),
        onTouchCancel: () => setStartLongPress(false),
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            {...attributes} 
            {...listeners}
            {...longPressProps}
            className={`min-w-[140px] flex-shrink-0 rounded-2xl p-4 border cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'scale-105 shadow-xl border-emerald-500' : isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-300'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{w.icon}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); onClickEdit(w); }}
                    className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Sửa ví"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate mb-1">{w.name}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(w.balance)}</p>
        </div>
    );
};

export default SortableWalletCard;
