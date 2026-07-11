import React, { useState } from 'react';
import { Wallet, Plus, Pencil, Trash2, AlertTriangle, GripVertical, ChevronDown, Download } from 'lucide-react';
import { addWallet, updateWallet, deleteWallet, updateWalletOrder, applyDefaultWallets } from '../../utils/firebaseHelpers';
import ConfirmModal from '../modals/ConfirmModal';
import WalletModal from '../modals/WalletModal';
import UpgradeProModal from '../modals/UpgradeProModal';

import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableWalletItem = ({ wallet, onEdit, onDelete, onSetDefault }) => {
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
        <div ref={setNodeRef} style={style} className={`bg-white dark:bg-slate-800 border ${isDragging ? 'border-emerald-500 shadow-md' : 'border-slate-200 dark:border-slate-700'} p-4 rounded-xl flex items-center justify-between shadow-sm relative group`}>
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 touch-none">
                    <GripVertical className="w-5 h-5" />
                </div>
                <div className="text-2xl">{wallet.icon || '💵'}</div>
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-white">{wallet.name}</h4>
                        {wallet.isDefault && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">Mặc định</span>
                        )}
                    </div>
                    {!wallet.isDefault && (
                        <button onClick={() => onSetDefault(wallet.id)} className="text-xs text-slate-400 hover:text-emerald-500 mt-1">
                            Đặt làm mặc định
                        </button>
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onEdit(wallet)} className="p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(wallet.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const WalletsSettings = ({ user, wallets, userSettings }) => {
    const [editModal, setEditModal] = useState({ isOpen: false, mode: 'add', data: null });
    const [confirmState, setConfirmState] = useState({ isOpen: false, data: null });
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const openAdd = () => {
        if (!userSettings?.isPro && wallets?.length >= 2) {
            setIsUpgradeModalOpen(true);
        } else {
            setEditModal({ isOpen: true, mode: 'add', data: null });
        }
    };

    const openEdit = (wallet) => {
        setEditModal({ isOpen: true, mode: 'edit', data: wallet });
    };

    const handleSave = async (formData) => {
        if (!user) return;
        try {
            if (editModal.mode === 'add') {
                await addWallet(user.uid, {
                    name: formData.name,
                    icon: formData.icon,
                    initialBalance: formData.initialBalance,
                    isDefault: false,
                    order: wallets.length, // Put at the end
                });
            } else {
                await updateWallet(user.uid, editModal.data.id, {
                    name: formData.name,
                    icon: formData.icon,
                    initialBalance: formData.initialBalance,
                });
            }
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
        setEditModal({ isOpen: false });
    };

    const handleDelete = async () => {
        if (!user || !confirmState.data) return;
        setIsDeleting(true);
        try {
            await deleteWallet(user.uid, confirmState.data);
        } catch (err) {
            alert('Lỗi xóa: ' + err.message);
        }
        setIsDeleting(false);
        setConfirmState({ isOpen: false, data: null });
    };

    const setAsDefault = async (walletId) => {
        if (!user) return;
        try {
            const currentDefault = wallets.find(w => w.isDefault);
            if (currentDefault && currentDefault.id !== walletId) {
                await updateWallet(user.uid, currentDefault.id, { isDefault: false });
            }
            await updateWallet(user.uid, walletId, { isDefault: true });
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = wallets.findIndex(w => w.id === active.id);
            const newIndex = wallets.findIndex(w => w.id === over.id);
            const newWallets = arrayMove(wallets, oldIndex, newIndex);
            try {
                await updateWalletOrder(user.uid, newWallets.map(w => w.id));
            } catch (error) {
                alert('Lỗi cập nhật vị trí: ' + error.message);
            }
        }
    };

    const handleLoadDefaultWallets = async () => {
        if (!user || isApplyingDefaults) return;
        
        if (window.confirm("Thêm các ví mặc định (Tiền mặt, Tài khoản ngân hàng, Thẻ tín dụng, Ví điện tử)? Các ví hiện tại của bạn vẫn sẽ được giữ nguyên.")) {
            setIsApplyingDefaults(true);
            try {
                const added = await applyDefaultWallets(user.uid);
                alert(`Đã tải thêm ${added} ví mặc định.`);
            } catch (error) {
                alert('Lỗi tải ví: ' + error.message);
            }
            setIsApplyingDefaults(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                    Quản lý Ví tiền
                </h3>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                        >
                            Mẫu <ChevronDown className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                            <button
                                onClick={handleLoadDefaultWallets}
                                disabled={isApplyingDefaults}
                                className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" /> {isApplyingDefaults ? 'Đang tải...' : 'Tải mẫu ví chuẩn'}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 dark:text-emerald-300 rounded-lg text-sm font-bold transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Thêm ví
                    </button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={wallets.map(w => w.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid gap-3">
                        {wallets.length === 0 ? (
                            <div className="text-center p-6 text-slate-400">Chưa có ví nào</div>
                        ) : (
                            wallets.map(wallet => (
                                <SortableWalletItem 
                                    key={wallet.id} 
                                    wallet={wallet} 
                                    onEdit={openEdit} 
                                    onDelete={(id) => setConfirmState({ isOpen: true, data: id })} 
                                    onSetDefault={setAsDefault} 
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            <WalletModal 
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false })}
                mode={editModal.mode}
                initialData={editModal.data}
                onSave={handleSave}
            />

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ isOpen: false, data: null })}
                onConfirm={handleDelete}
                title="Xóa ví tiền?"
                description="Lưu ý: Các giao dịch cũ thuộc ví này sẽ bị mồ côi (không thuộc ví nào). Bạn có chắc muốn xóa?"
                confirmText="Xóa"
                confirmVariant="danger"
                isProcessing={isDeleting}
                Icon={AlertTriangle}
                iconColorClass="text-rose-600"
                iconBgClass="bg-rose-100"
            />

            <UpgradeProModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                user={user}
            />
        </div>
    );
};

export default WalletsSettings;
