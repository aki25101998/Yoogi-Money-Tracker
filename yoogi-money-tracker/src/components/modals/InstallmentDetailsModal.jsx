import { useBackButton } from '../../hooks/useBackButton';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trash2, Pencil, RefreshCw, ChevronDown, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import InstallmentItem from '../InstallmentItem';
import { calculateItemStats, getYearMonth } from '../../utils/calculations';

const InstallmentDetailsModal = ({ 
    isOpen, 
    onClose, 
    groupedLender, 
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Trash2, Pencil, RefreshCw, ChevronDown, Plus } from 'lucide-react';
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
    referenceDate,
    onAddNewItem,
    onMinimumPayment,
    transactions,
    onEditTransaction,
    onPayInstallments
}) => {
    useBackButton(isOpen, onClose);
    const [activeTab, setActiveTab] = useState('active'); // active, paid, history
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState([]);

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
        setIsSelectionMode(false);
        setSelectedItemIds([]);
    };

    const getDisplayItems = () => {
        if (activeTab === 'active') return activeItems;
        if (activeTab === 'paid') return paidItems;
        return historyItems;
    };

    const displayItems = getDisplayItems();

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg h-[85vh] max-h-[800px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => onAddNewItem && onAddNewItem(groupedLender.lenderName)} 
                                className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-lg transition-colors"
                                title="Thêm khoản mới cho đơn vị này"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                        </div>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                        <button 
                            onClick={() => handleTabChange('active')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đang chờ ({activeItems.length})
                        </button>
                        <button 
                            onClick={() => handleTabChange('paid')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'paid' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Đã xong ({paidItems.length})
                        </button>
                        <button 
                            onClick={() => handleTabChange('history')}
                            className={`flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Lịch sử ({historyItems.length})
                        </button>
                    </div>

                    {activeTab === 'active' && activeItems.length > 0 && (
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={() => {
                                    setIsSelectionMode(!isSelectionMode);
                                    setSelectedItemIds([]);
                                }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isSelectionMode ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}
                            >
                                {isSelectionMode ? 'Hủy chọn nhiều' : 'Chọn nhiều để thanh toán'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-3 bg-slate-50 dark:bg-slate-900/20">
                    {displayItems.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            Không có mục nào trong danh sách này.
                        </div>
                    ) : (
                        displayItems.map(wrapper => {
                            const itemId = `${wrapper.item.id}-${wrapper.index}`;
                            const isSelected = selectedItemIds.includes(itemId);
                            return (
                                <div key={itemId} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-3">
                                    <InstallmentItem
                                        item={wrapper.item}
                                        onEdit={() => onEditItem(wrapper.item)}
                                        onDelete={onDeleteItem}
                                        referenceDate={wrapper.refDate}
                                        isPaid={activeTab === 'paid' || activeTab === 'history'}
                                        onTogglePaid={(item) => onTogglePaid(item, wrapper.monthStr)}
                                        onMinimumPayment={(item) => onMinimumPayment(item, wrapper.monthStr)}
                                        isReadOnly={false}
                                        kyIndex={wrapper.index}
                                        transactions={transactions}
                                        onEditTransaction={onEditTransaction}
                                        isSelectable={isSelectionMode}
                                        isSelected={isSelected}
                                        onToggleSelect={() => {
                                            if (isSelected) {
                                                setSelectedItemIds(prev => prev.filter(id => id !== itemId));
                                            } else {
                                                setSelectedItemIds(prev => [...prev, itemId]);
                                            }
                                        }}
                                        onPayItem={() => {
                                            if (onPayInstallments) {
                                                onPayInstallments([wrapper]);
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>

                {isSelectionMode && selectedItemIds.length > 0 && (
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Đã chọn {selectedItemIds.length} khoản</p>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(
                                        activeItems.filter(w => selectedItemIds.includes(`${w.item.id}-${w.index}`)).reduce((sum, w) => sum + w.item.monthlyPayment, 0)
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    if (onPayInstallments) {
                                        const selectedWrappers = activeItems.filter(w => selectedItemIds.includes(`${w.item.id}-${w.index}`));
                                        onPayInstallments(selectedWrappers);
                                    }
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-colors"
                            >
                                Thanh toán
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default InstallmentDetailsModal;
