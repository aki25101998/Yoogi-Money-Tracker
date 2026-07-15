import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, GripVertical } from 'lucide-react';
import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableReorderItem = ({ wallet }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: wallet.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white dark:bg-slate-800 border ${isDragging ? 'border-emerald-500 shadow-md' : 'border-slate-200 dark:border-slate-700'} p-3 rounded-xl flex items-center justify-between shadow-sm relative`}>
            <div className="flex items-center gap-3">
                <div className="text-xl">{wallet.icon || '💵'}</div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">{wallet.name}</h4>
            </div>
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-3 -mr-2 text-slate-400 hover:text-slate-600 touch-none">
                <GripVertical className="w-5 h-5" />
            </div>
        </div>
    );
};

const ReorderWalletsModal = ({ isOpen, onClose, wallets, onSave }) => {
const [localWallets, setLocalWallets] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setLocalWallets([...wallets]);
        }
    }, [isOpen, wallets]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = localWallets.findIndex(w => w.id === active.id);
            const newIndex = localWallets.findIndex(w => w.id === over.id);
            setLocalWallets(arrayMove(localWallets, oldIndex, newIndex));
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 text-center">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-0.5">Sắp xếp lại chuỗi ví</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Giữ và kéo để sắp xếp lại trình tự ví.</p>
                </div>

                <div className="p-5 overflow-y-auto flex-1">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={localWallets.map(w => w.id)} strategy={verticalListSortingStrategy}>
                            <div className="flex flex-col gap-2.5">
                                {localWallets.map(wallet => (
                                    <SortableReorderItem key={wallet.id} wallet={wallet} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="p-5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 flex-1 rounded-xl font-bold text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={() => onSave(localWallets.map(w => w.id))}
                        className="px-4 py-2.5 flex-1 rounded-xl font-bold text-sm text-white bg-teal-500 hover:bg-teal-600 transition-colors"
                    >
                        Lưu
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReorderWalletsModal;
