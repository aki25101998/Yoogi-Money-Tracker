import React from 'react';
import { Pencil, Trash2, User } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { formatCurrency } from '../utils/formatters';
import { calculateItemStats } from '../utils/calculations';

const InstallmentItem = ({ item, onEdit, onDelete, referenceDate }) => {
    const stats = calculateItemStats(item, referenceDate);

    return (
        <Card className="overflow-hidden hover:shadow-md transition-all duration-200 group border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-600">
                                <User className="w-3 h-3" /> {item.owner || 'Tôi'}
                            </div>
                            {stats.isFinished ? <Badge type="success">Đã xong</Badge> : <Badge type="blue">Còn {item.term - stats.effectiveMonths} tháng</Badge>}
                        </div>
                        <h4 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white line-clamp-1 mb-1">{item.name}</h4>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3">
                            <span>{new Date(item.startDate).toLocaleDateString('vi-VN')}</span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span>{item.term} kỳ</span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span className="text-rose-500 font-medium">{item.rate}% lãi</span>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)} className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(item.id)} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Trả mỗi tháng</p>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(item.monthlyPayment)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Còn nợ</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(stats.remainingAmount)}</p>
                    </div>
                </div>
                <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100 dark:bg-slate-700">
                        <div style={{ width: `${stats.progress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ease-out ${stats.isFinished ? 'bg-green-500' : 'bg-indigo-500 dark:bg-indigo-600'}`}></div>
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium"><span>{Math.round(stats.progress)}%</span><span>{stats.effectiveMonths}/{item.term} kỳ</span></div>
                </div>
            </div>
        </Card>
    );
};

export default InstallmentItem;
