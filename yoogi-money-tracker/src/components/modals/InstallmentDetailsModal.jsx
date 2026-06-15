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
    onTogglePaid
}) => {
    const [activeTab, setActiveTab] = useState('active'); // active, paid

    if (!isOpen || !groupedLender) return null;

    // Phân loại item
    const activeItems = [];
    const paidItems = [];

    (groupedLender.items || []).forEach(item => {
        const start = new Date(item.startDate);
        const paidMonths = item.paidMonths || [];
        
        let nextUnpaidMonth = null;
        for (let i = 0; i < item.term; i++) {
            const checkDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const mStr = getYearMonth(checkDate);
            if (!paidMonths.includes(mStr)) {
                nextUnpaidMonth = { monthStr: mStr, index: i + 1, refDate: checkDate };
                break;
            }
        }

        if (!nextUnpaidMonth) {
            const lastDate = new Date(start.getFullYear(), start.getMonth() + item.term - 1, 1);
            paidItems.push({
                item: item,
                index: item.term,
                refDate: lastDate,
                monthStr: getYearMonth(lastDate)
            });
        } else {
            activeItems.push({
                item: item,
                index: nextUnpaidMonth.index,
                refDate: nextUnpaidMonth.refDate,
                monthStr: nextUnpaidMonth.monthStr
            });
        }
    });

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Chi tiết trả góp</h3>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{groupedLender.lenderName}</p>
                        </div>
                        <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                        <button 
                            onClick={() => handleTabChange('active')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đang chờ thanh toán ({activeItems.length})
                        </button>
                        <button 
                            onClick={() => handleTabChange('paid')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'paid' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đã hoàn thành ({paidItems.length})
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/20">
                    {(activeTab === 'active' ? activeItems : paidItems).length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            Không có mục nào trong danh sách này.
                        </div>
                    ) : (
                        (activeTab === 'active' ? activeItems : paidItems).map(wrapper => (
                            <div key={`${wrapper.item.id}-${wrapper.index}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-3">
                                <InstallmentItem
                                    item={wrapper.item}
                                    onEdit={() => onEditItem(wrapper.item)}
                                    onDelete={onDeleteItem}
                                    referenceDate={wrapper.refDate}
                                    isPaid={activeTab === 'paid'}
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
