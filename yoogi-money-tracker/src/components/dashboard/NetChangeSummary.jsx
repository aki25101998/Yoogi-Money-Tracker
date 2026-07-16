import React from 'react';
import { Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const NetChangeSummary = ({ summaryStats }) => {
    return (
        <div className="bg-gradient-to-br from-cyan-100 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/20 rounded-[28px] p-6 shadow-sm border border-white/50 dark:border-cyan-800/30 mb-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-slate-600 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                        Thay đổi ròng <Info className="w-4 h-4 text-slate-400" />
                    </p>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                        {formatCurrency(summaryStats.balance)}
                    </h2>
                </div>
            </div>

            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center sm:block sm:text-center">
                    <p className="text-rose-500 text-sm font-black uppercase tracking-wider sm:mb-1 drop-shadow-sm">Chi phí</p>
                    <p className="text-rose-600 dark:text-rose-400 text-lg font-black flex items-center justify-center gap-1">
                        <ArrowDownRight className="w-5 h-5" />
                        {formatCurrency(summaryStats.expense)}
                    </p>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center sm:block sm:text-center">
                    <p className="text-emerald-500 text-sm font-black uppercase tracking-wider sm:mb-1 drop-shadow-sm">Thu nhập</p>
                    <p className="text-emerald-600 dark:text-emerald-400 text-lg font-black flex items-center justify-center gap-1">
                        <ArrowUpRight className="w-5 h-5" />
                        {formatCurrency(summaryStats.income)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NetChangeSummary;
