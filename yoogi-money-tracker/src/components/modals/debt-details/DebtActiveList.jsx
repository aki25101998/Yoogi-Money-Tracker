import React from 'react';
import { X, Calendar, Pencil, Trash2, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import AmountInput from '../../ui/AmountInput';

const DebtActiveList = ({
    debts,
    wallets,
    confirmPaymentDebt,
    setConfirmPaymentDebt,
    confirmQuickPay,
    editingDebtId,
    cancelEdit,
    editForm,
    setEditForm,
    saveEdit,
    isSaving,
    payingDebtId,
    handleQuickPayClick,
    startEdit,
    onDeleteDebt
}) => {
    if (debts.length === 0) {
        return (
            <div className="text-center text-slate-500 py-8">
                Không có khoản nợ nào trong mục này.
            </div>
        );
    }

    return (
        <>
            {debts.map(debt => {
                const progress = debt.totalAmount > 0 ? Math.round(((debt.repaidAmount || 0) / debt.totalAmount) * 100) : 0;
                const remaining = debt.totalAmount - (debt.repaidAmount || 0);

                return (
                    <div key={debt.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                        {confirmPaymentDebt?.debt.id === debt.id ? (
                            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-sm text-slate-800 dark:text-white">Xác nhận trả nợ</span>
                                    <button onClick={() => setConfirmPaymentDebt(null)} className="p-1"><X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-300">
                                    Bạn muốn thanh toán toàn bộ phần nợ còn lại?
                                </div>
                                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <span className="text-xs font-medium text-slate-500">Số tiền:</span>
                                    <span className="font-bold text-emerald-500 text-base">{formatCurrency(remaining)}</span>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Trừ tiền từ ví</label>
                                    <div className="relative">
                                        <select
                                            value={confirmPaymentDebt.walletId}
                                            onChange={e => setConfirmPaymentDebt({ ...confirmPaymentDebt, walletId: e.target.value })}
                                            className="w-full pl-3 pr-8 py-2.5 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer text-sm font-medium"
                                        >
                                            <option value="" disabled>Chọn ví</option>
                                            {wallets?.map(w => (
                                                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <button
                                        onClick={() => setConfirmPaymentDebt(null)}
                                        className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors text-sm"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={confirmQuickPay}
                                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-colors flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Check className="w-4 h-4" /> Xác nhận
                                    </button>
                                </div>
                            </div>
                        ) : editingDebtId === debt.id ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-sm text-slate-800 dark:text-white">Chỉnh sửa khoản nợ</span>
                                    <button onClick={cancelEdit} className="p-1"><X className="w-4 h-4 text-slate-400" /></button>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Số tiền mượn</label>
                                    <AmountInput
                                        value={editForm.amount}
                                        onChange={(value) => setEditForm({ ...editForm, amount: value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Ngày mượn</label>
                                    <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Trích từ ví</label>
                                    <div className="relative">
                                        <select
                                            value={editForm.walletId}
                                            onChange={e => setEditForm({ ...editForm, walletId: e.target.value })}
                                            className="w-full pl-3 pr-8 py-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer text-sm"
                                        >
                                            <option value="" disabled>Chọn ví</option>
                                            {wallets?.map(w => (
                                                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">Ghi chú</label>
                                    <input
                                        type="text"
                                        value={editForm.notes}
                                        onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div className="pt-2">
                                    <button
                                        onClick={() => saveEdit(debt)}
                                        disabled={isSaving}
                                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        {isSaving ? 'Đang lưu...' : <><Check className="w-4 h-4" /> Lưu thay đổi</>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Calendar className="w-[18px] h-[18px]" />
                                        <span className="text-[15px] font-semibold">{new Date(debt.date || debt.createdAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {debt.status === 'paid' && (
                                            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                Đã trả xong
                                            </div>
                                        )}
                                        {debt.status === 'active' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleQuickPayClick(debt); }}
                                                disabled={payingDebtId === debt.id}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors ${payingDebtId === debt.id ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-400 cursor-not-allowed' : 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-500'}`}
                                                title="Thanh toán toàn bộ phần còn lại"
                                            >
                                                {payingDebtId === debt.id ? (
                                                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xử lý...</>
                                                ) : (
                                                    <><Check className="w-3.5 h-3.5" /> Chưa trả</>
                                                )}
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); startEdit(debt); }}
                                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                            title="Sửa khoản nợ này"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteDebt(debt.id); }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Xóa khoản nợ này"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className={`px-3 py-1.5 rounded-xl shadow-sm inline-flex items-center max-w-[65%] border ${debt.status === 'active' ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'}`}>
                                            <span className="text-[15px] font-bold truncate">
                                                {debt.notes ? debt.notes : 'Đã mượn'}
                                            </span>
                                        </div>
                                        <span className="font-bold text-lg text-slate-800 dark:text-white shrink-0">{formatCurrency(debt.totalAmount)}</span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Đã trả: {formatCurrency(debt.repaidAmount || 0)}</span>
                                            <span className="font-medium text-slate-500">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                    {debt.status === 'active' && (
                                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Còn nợ</span>
                                            <span className="font-bold text-orange-500">{formatCurrency(remaining)}</span>
                                        </div>
                                    )}

                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </>
    );
};

export default DebtActiveList;
