import React, { useState } from 'react';
import { Wallet, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { addWallet, updateWallet, deleteWallet } from '../../utils/firebaseHelpers';
import ConfirmModal from '../modals/ConfirmModal';

const WalletsSettings = ({ user, wallets }) => {
    const [editModal, setEditModal] = useState({ isOpen: false, mode: 'add', data: null });
    const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('💵');

    const [confirmState, setConfirmState] = useState({ isOpen: false, data: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const EMOJI_PICKS = ['💵', '💳', '🏦', '📱', '💰', '💼', '🐖'];

    const openAdd = () => {
        setEditModal({ isOpen: true, mode: 'add', data: null });
        setFormName('');
        setFormIcon('💵');
    };

    const openEdit = (wallet) => {
        setEditModal({ isOpen: true, mode: 'edit', data: wallet });
        setFormName(wallet.name);
        setFormIcon(wallet.icon || '💵');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !formName.trim()) return;

        try {
            if (editModal.mode === 'add') {
                await addWallet(user.uid, {
                    name: formName.trim(),
                    icon: formIcon,
                    isDefault: false,
                });
            } else {
                await updateWallet(user.uid, editModal.data.id, {
                    name: formName.trim(),
                    icon: formIcon,
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
            // Find current default and unset it
            const currentDefault = wallets.find(w => w.isDefault);
            if (currentDefault && currentDefault.id !== walletId) {
                await updateWallet(user.uid, currentDefault.id, { isDefault: false });
            }
            await updateWallet(user.uid, walletId, { isDefault: true });
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                    Quản lý Ví tiền
                </h3>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 dark:text-emerald-300 rounded-lg text-sm font-bold transition-colors"
                >
                    <Plus className="w-4 h-4" /> Thêm ví
                </button>
            </div>

            <div className="grid gap-3">
                {wallets.length === 0 ? (
                    <div className="text-center p-6 text-slate-400">Chưa có ví nào</div>
                ) : (
                    wallets.map(wallet => (
                        <div key={wallet.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="text-2xl">{wallet.icon || '💵'}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-800 dark:text-white">{wallet.name}</h4>
                                        {wallet.isDefault && (
                                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">Mặc định</span>
                                        )}
                                    </div>
                                    {!wallet.isDefault && (
                                        <button onClick={() => setAsDefault(wallet.id)} className="text-xs text-slate-400 hover:text-emerald-500 mt-1">
                                            Đặt làm mặc định
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(wallet)} className="p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmState({ isOpen: true, data: wallet.id })} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Add/Edit */}
            {editModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {editModal.mode === 'add' ? 'Thêm Ví mới' : 'Sửa Ví'}
                            </h3>
                            <button onClick={() => setEditModal({ isOpen: false })}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Biểu tượng</label>
                                <div className="flex flex-wrap gap-2">
                                    {EMOJI_PICKS.map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setFormIcon(emoji)}
                                            className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${formIcon === emoji ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-500 scale-110' : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100'}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên ví</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:outline-none"
                                    placeholder="Vd: Tiền mặt, Thẻ ATM..."
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-2">
                                Lưu
                            </button>
                        </form>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default WalletsSettings;
