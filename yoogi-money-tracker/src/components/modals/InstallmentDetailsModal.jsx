import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trash2, Pencil, RefreshCw, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import InstallmentItem from '../InstallmentItem';
import { calculateItemStats, getYearMonth } from '../../utils/calculations';

const InstallmentDetailsModal = ({ 
    isOpen, 
    onClose, 
    groupedLender, 
    onEditItem, 
    onDeleteItem, 
    onTogglePaid,
    referenceDate
}) => {
    const [activeTab, setActiveTab] = useState('active'); // active, paid, history

    if (!isOpen || !groupedLender) return null;

    const refDate = referenceDate || new Date();
    const targetMonthStr = getYearMonth(refDate);

    // Phân loại item
    const activeItems = [];
    const paidItems = [];
    const historyItems = [];

    (groupedLender.items || []).forEach(item => {
        const start = new Date(item.startDate);
        const paidMonths = item.paidMonths || [];
        
        for (let i = 0; i < item.term; i++) {
            const checkDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const mStr = getYearMonth(checkDate);
            const isPaid = paidMonths.includes(mStr);
            
            if (mStr < targetMonthStr) {
                if (isPaid) {
                    historyItems.push({
                        item: item,
                        index: i + 1,
                        refDate: checkDate,
                        monthStr: mStr
                    });
                } else {
                    activeItems.push({
                        item: item,
                        index: i + 1,
                        refDate: checkDate,
                        monthStr: mStr
                    });
                }
            } else if (mStr === targetMonthStr) {
                if (isPaid) {
                    paidItems.push({
                        item: item,
                        index: i + 1,
                        refDate: checkDate,
                        monthStr: mStr
                    });
                } else {
                    activeItems.push({
                        item: item,
                        index: i + 1,
                        refDate: checkDate,
                        monthStr: mStr
                    });
                }
            }
        }
    });

    activeItems.sort((a, b) => a.monthStr.localeCompare(b.monthStr));
    paidItems.sort((a, b) => b.monthStr.localeCompare(a.monthStr));
    historyItems.sort((a, b) => b.monthStr.localeCompare(a.monthStr));

    const amountDueThisMonth = activeItems.reduce((sum, wrapper) => sum + wrapper.item.monthlyPayment, 0);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const getDisplayItems = () => {
        if (activeTab === 'active') return activeItems;
        if (activeTab === 'paid') return paidItems;
        return historyItems;
    };

    const displayItems = getDisplayItems();

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Chi tiết trả góp</h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">{groupedLender.lenderName}</span>
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold border border-indigo-100 dark:border-indigo-500/20">
                                    Đang nợ {activeItems.length} / {activeItems.length + paidItems.length} khoản
                                </span>
                                {amountDueThisMonth > 0 && (
                                    <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-xs font-semibold border border-orange-100 dark:border-orange-500/20">
                                        Cần đóng: {formatCurrency(amountDueThisMonth)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                    </div>

                    <div className="relative group w-full">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800/50 w-full cursor-pointer">
                            <div className="flex items-center gap-2">
                                {activeTab === 'active' && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                                {activeTab === 'paid' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                {activeTab === 'history' && <span className="w-2 h-2 rounded-full bg-slate-500"></span>}
                                <span className={`font-bold ${activeTab === 'active' ? 'text-indigo-600 dark:text-indigo-400' : activeTab === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {activeTab === 'active' ? `Đang chờ thanh toán (${activeItems.length})` : 
                                     activeTab === 'paid' ? `Đã hoàn thành (${paidItems.length})` : 
                                     `Lịch sử giao dịch (${historyItems.length})`}
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                        <select 
                            value={activeTab} 
                            onChange={(e) => handleTabChange(e.target.value)} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        >
                            <option value="active">Đang chờ thanh toán ({activeItems.length})</option>
                            <option value="paid">Đã hoàn thành ({paidItems.length})</option>
                            <option value="history">Lịch sử giao dịch ({historyItems.length})</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/20">
                    {displayItems.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            Không có mục nào trong danh sách này.
                        </div>
                    ) : (
                        displayItems.map(wrapper => (
                            <div key={`${wrapper.item.id}-${wrapper.index}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-3">
                                <InstallmentItem
                                    item={wrapper.item}
                                    onEdit={() => onEditItem(wrapper.item)}
                                    onDelete={onDeleteItem}
                                    referenceDate={wrapper.refDate}
                                    isPaid={activeTab === 'paid' || activeTab === 'history'}
                                    onTogglePaid={(item) => onTogglePaid(item, wrapper.monthStr)}
                                    isReadOnly={false}
                                    kyIndex={wrapper.index}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InstallmentDetailsModal;
