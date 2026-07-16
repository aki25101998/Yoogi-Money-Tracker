import React from 'react';
import { X, Calendar, Pencil, Trash2, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import AmountInput from '../../ui/AmountInput';

const DebtHistoryList = ({
    paymentHistory, editingPaymentId, paymentEditForm, setPaymentEditForm, wallets, isSaving,
    cancelEditPayment, saveEditPayment, startEditPayment, handleDeletePayment
}) => {
    if (paymentHistory.length === 0) {
        return (
            <div className="text-center text-slate-500 py-8">
                Chưa có lịch sử thanh toán nào.
            </div>
        );
    }

    return (
        <>
            {paymentHistory.map(payment => (
                <div key={payment.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                    {editingPaymentId === payment.id ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm text-slate-800 dark:text-white">Sửa lịch sử trả</span>
                                <button onClick={cancelEditPayment} className="p-1"><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 font-medium block mb-1">Số tiền đã trả</label>
                                <AmountInput
                                    value={paymentEditForm.amount}
                                    onChange={(value) => setPaymentEditForm({ ...paymentEditForm, amount: value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 font-medium block mb-1">Vào ví</label>
                                <div className="relative">
                                    <select
                                        value={paymentEditForm.walletId}
                                        onChange={e => setPaymentEditForm({ ...paymentEditForm, walletId: e.target.value })}
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
                                    value={paymentEditForm.notes}
                                    onChange={e => setPaymentEditForm({ ...paymentEditForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={() => saveEditPayment(payment)}
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
                                    <span className="text-[15px] font-semibold">{new Date(payment.date).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3" /> Thu hồi
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); startEditPayment(payment); }}
                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        title="Sửa lịch sử trả"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeletePayment(payment); }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Xóa lịch sử trả"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Đã trả</span>
                                    <span className="font-bold text-emerald-500">+{formatCurrency(payment.amount)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                    <span className="text-xs text-slate-400">Vào ví</span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {wallets?.find(w => w.id === payment.walletId)?.name || 'Không rõ'}
                                    </span>
                                </div>
                                {payment.description && (
                                    <div className="pt-2">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl shadow-sm inline-flex items-center max-w-full">
                                            <span className="text-[14px] font-bold truncate">{payment.description}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ))}
        </>
    );
};

export default DebtHistoryList;
