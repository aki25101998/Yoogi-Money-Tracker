import React from 'react';
import { Pencil, Trash2, User, AlertCircle } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { formatCurrency } from '../utils/formatters';
import { calculateItemStats, monthDiff } from '../utils/calculations';

const InstallmentItem = ({ item, onEdit, onDelete, referenceDate, isPaid, onTogglePaid, onMinimumPayment, isReadOnly, kyIndex }) => {
    const stats = calculateItemStats(item, referenceDate);
    const paidCount = Array.isArray(item.paidMonths) ? item.paidMonths.length : stats.effectiveMonths;
    const cannotTickMore = !isPaid && paidCount >= item.term;
    const isDisabled = isReadOnly || cannotTickMore;

    // Calculate missed payments
    const now = new Date();
    const start = new Date(item.startDate);
    const monthsPassedTotal = monthDiff(start, now);
    const monthsShouldHavePaid = Math.min(monthsPassedTotal, item.term);
    const missedCount = monthsShouldHavePaid - paidCount;
    const showMissedWarning = missedCount > 0 && paidCount < item.term;

    // Partial payment logic for this specific month
    const currentMonthStr = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
    const partialPaid = (item.partialPayments && item.partialPayments[currentMonthStr]) || 0;
    const partialProgress = item.monthlyPayment > 0 ? Math.min(Math.round((partialPaid / item.monthlyPayment) * 100), 100) : 0;
    const monthlyRemaining = Math.max(item.monthlyPayment - partialPaid, 0);

    return (
        <Card className={`overflow-hidden transition-all duration-200 group border-slate-200 dark:border-slate-700 ${isPaid ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'bg-white dark:bg-slate-800'}`}>
            <div className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-600">
                                <User className="w-3 h-3" /> {item.owner || 'Tôi'}
                            </div>
                            <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-indigo-200 dark:border-indigo-800">
                                {kyIndex ? `Kỳ ${kyIndex}/${item.term} (T${referenceDate.getMonth() + 1}/${referenceDate.getFullYear()})` : `Kỳ T${referenceDate.getMonth() + 1}/${referenceDate.getFullYear()}`}
                            </div>
                            {stats.isFinished ? (
                                <Badge type="success">Hoàn tất</Badge>
                            ) : (
                                <Badge type="blue">Còn {item.term - stats.effectiveMonths} tháng</Badge>
                            )}
                        </div>
                        <h4 className={`font-bold text-base sm:text-lg line-clamp-1 mb-1 ${isPaid ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>{item.name}</h4>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>{new Date(item.startDate).toLocaleDateString('vi-VN')}</span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span>{item.term} kỳ</span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span className="text-rose-500 font-medium">{item.rate}% lãi</span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full hidden sm:block"></span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Gốc: {formatCurrency(item.monthlyPayment * item.term)}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)} className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(item.id)} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <div className="flex-1">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Trả mỗi tháng</p>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(item.monthlyPayment)}</p>
                        
                        {!isPaid && partialPaid > 0 && (
                            <div className="mt-2 pr-4">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Đã trả: {formatCurrency(partialPaid)}</span>
                                    <span className="text-[10px] text-slate-400">{partialProgress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${partialProgress}%` }}></div>
                                </div>
                                <span className="text-[10px] text-orange-500 font-medium block">Còn lại: {formatCurrency(monthlyRemaining)}</span>
                            </div>
                        )}
                    </div>

                    {/* Payment Toggle Button */}
                    <div className="flex-1 flex justify-end items-center gap-2">
                        {!isPaid && !isDisabled && onMinimumPayment && (
                            <button
                                onClick={() => onMinimumPayment(item)}
                                className="px-3 py-2 rounded-lg font-bold text-sm transition-all border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-900/40 active:scale-95"
                            >
                                Trả tối thiểu
                            </button>
                        )}
                        <button
                            onClick={() => onTogglePaid && onTogglePaid(item)}
                            disabled={isDisabled}
                            title={cannotTickMore ? "Đã đạt số kỳ tối đa" : ""}
                            className={`
                                flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all
                                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                                ${isPaid
                                    ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                    : 'bg-white text-slate-600 border border-slate-300 shadow-sm hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-indigo-500'
                                }
                            `}
                        >
                            {isPaid ? (
                                <>
                                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span>Đã trả</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-500"></div>
                                    <span>Chưa trả</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Progress Bar - Only separate logic if needed, but 'stats' handles it now */}
                <div className="relative pt-1">
                    <div className="flex justify-between items-end mb-1">
                        <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mr-1">Còn nợ:</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(stats.remainingAmount)}</span>
                        </div>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100 dark:bg-slate-700">
                        <div style={{ width: `${stats.progress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ease-out ${stats.isFinished ? 'bg-green-500' : 'bg-indigo-500 dark:bg-indigo-600'}`}></div>
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        <span>{Math.round(stats.progress)}%</span>
                        <span>{stats.effectiveMonths}/{item.term} kỳ</span>
                    </div>
                </div>

                {showMissedWarning && (
                    <div className="mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Cảnh báo trễ hạn</p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                                Bạn đang thiếu tick đã trả cho <span className="font-bold">{missedCount} kỳ</span> trong quá khứ. Hãy kiểm tra lại lịch sử!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default InstallmentItem;
