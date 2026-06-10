import React, { useState } from 'react';
import { Users, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { addPayer, updatePayer, deletePayer } from '../../utils/firebaseHelpers';
import ConfirmModal from '../modals/ConfirmModal';

const PayersSettings = ({ user, payers }) => {
    const [editModal, setEditModal] = useState({ isOpen: false, mode: 'add', data: null });
    const [formName, setFormName] = useState('');

    const [confirmState, setConfirmState] = useState({ isOpen: false, data: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const openAdd = () => {
        setEditModal({ isOpen: true, mode: 'add', data: null });
        setFormName('');
    };

    const openEdit = (payer) => {
        setEditModal({ isOpen: true, mode: 'edit', data: payer });
        setFormName(payer.name);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !formName.trim()) return;

        try {
            if (editModal.mode === 'add') {
                await addPayer(user.uid, {
                    name: formName.trim(),
                });
            } else {
                await updatePayer(user.uid, editModal.data.id, {
                    name: formName.trim(),
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
            await deletePayer(user.uid, confirmState.data);
        } catch (err) {
            alert('Lỗi xóa: ' + err.message);
        }
        setIsDeleting(false);
        setConfirmState({ isOpen: false, data: null });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Người trả góp
                </h3>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 dark:text-indigo-300 rounded-lg text-sm font-bold transition-colors"
                >
                    <Plus className="w-4 h-4" /> Thêm người
                </button>
            </div>

            <div className="grid gap-3">
                {payers.length === 0 ? (
                    <div className="text-center p-6 text-slate-400">Chưa có ai</div>
                ) : (
                    payers.map(payer => (
                        <div key={payer.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                    {payer.name.charAt(0).toUpperCase()}
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-white">{payer.name}</h4>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(payer)} className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmState({ isOpen: true, data: payer.id })} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
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
                                {editModal.mode === 'add' ? 'Thêm Người' : 'Sửa tên'}
                            </h3>
                            <button onClick={() => setEditModal({ isOpen: false })}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tên người trả</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                                    placeholder="Vd: Tôi, Vợ, Chồng..."
                                />
                            </div>
                            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl mt-2">
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
                title="Xóa người này?"
                description="Lưu ý: Bạn không nên xóa người đang có khoản trả góp."
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

export default PayersSettings;
