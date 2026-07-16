import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8'];

const DashboardChart = ({ 
    chartType, 
    setChartType, 
    pieChartData, 
    summaryStats, 
    setSelectedCategoryForModal 
}) => {
    const [activeSegment, setActiveSegment] = useState(null);

    const handlePieMouseEnter = (data, index) => {
        const midAngle = (data.startAngle + data.endAngle) / 2;
        const normalized = ((midAngle % 360) + 360) % 360;
        const radian = (Math.PI / 180) * midAngle;

        const tooltipDistance = (data.outerRadius || 100) + 22;
        const x = data.cx + tooltipDistance * Math.cos(radian);
        const y = data.cy - tooltipDistance * Math.sin(radian);

        let direction, transform;
        if (normalized >= 315 || normalized < 45) {
            direction = 'right';
            transform = 'translate(6px, -50%)';
        } else if (normalized >= 45 && normalized < 135) {
            direction = 'top';
            transform = 'translate(-50%, calc(-100% - 6px))';
        } else if (normalized >= 135 && normalized < 225) {
            direction = 'left';
            transform = 'translate(calc(-100% - 6px), -50%)';
        } else {
            direction = 'bottom';
            transform = 'translate(-50%, 6px)';
        }

        setActiveSegment({
            data: pieChartData[index],
            x, y, direction, transform, index,
        });
    };

    const handlePieMouseLeave = () => {
        setActiveSegment(null);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            {/* Toggle */}
            <div className="flex justify-center mb-6">
                <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-full flex">
                    <button
                        onClick={() => setChartType('expense')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${chartType === 'expense' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Chi phí
                    </button>
                    <button
                        onClick={() => setChartType('income')}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${chartType === 'income' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Thu nhập
                    </button>
                </div>
            </div>

            {/* Donut Chart */}
            {pieChartData.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    Chưa có dữ liệu {chartType === 'income' ? 'thu nhập' : 'chi phí'}
                </div>
            ) : (
                <>
                    <div className="h-64 mb-6 relative overflow-visible">
                        {/* Inner Donut Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                            <span className="text-slate-400 text-xs font-bold uppercase mb-1">Tổng cộng</span>
                            <span className="text-lg font-bold text-slate-800 dark:text-white">
                                {formatCurrency(summaryStats[chartType])}
                            </span>
                        </div>
                        
                        <div className="relative z-10 w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%" cy="50%"
                                        innerRadius={70} outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                        activeIndex={-1}
                                        activeShape={false}
                                        isAnimationActive={true}
                                        onMouseEnter={handlePieMouseEnter}
                                        onMouseLeave={handlePieMouseLeave}
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" strokeWidth={0} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Custom Tooltip (PC only) */}
                        {activeSegment && (
                            <div 
                                className="absolute z-30 pointer-events-none hidden md:block"
                                style={{
                                    left: activeSegment.x,
                                    top: activeSegment.y,
                                    transform: activeSegment.transform,
                                }}
                            >
                                <div 
                                    key={`seg-${activeSegment.index}`}
                                    className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-w-[120px] whitespace-nowrap"
                                    style={{
                                        animation: `tooltip-slide-${activeSegment.direction} 0.25s ease-out both`,
                                    }}
                                >
                                    <p className="text-sm text-slate-600 dark:text-white mb-1">
                                        {activeSegment.data.name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-sm" 
                                            style={{ backgroundColor: activeSegment.data.fill || COLORS[0] }} 
                                        />
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                                            {formatCurrency(activeSegment.data.value)} ({activeSegment.data.percent ? activeSegment.data.percent.toFixed(1) : 0}%)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Custom Tooltip Fixed (Mobile only) */}
                    <div className="md:hidden min-h-[60px] flex items-center justify-center -mt-4 mb-4 transition-all px-4">
                        {activeSegment ? (
                            <div 
                                key={`seg-mobile-${activeSegment.index}`}
                                className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 w-full animate-in fade-in zoom-in-95 duration-200"
                            >
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 text-center font-bold uppercase tracking-wider">
                                    {activeSegment.data.name}
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-sm shadow-sm" 
                                        style={{ backgroundColor: activeSegment.data.fill || COLORS[0] }} 
                                    />
                                    <p className="text-base font-bold text-slate-800 dark:text-white">
                                        {formatCurrency(activeSegment.data.value)} 
                                        <span className="text-xs font-semibold text-slate-400 ml-1">({activeSegment.data.percent ? activeSegment.data.percent.toFixed(1) : 0}%)</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                Chạm vào biểu đồ để xem chi tiết
                            </div>
                        )}
                    </div>

                    {/* Progress Bars List */}
                    <div className="space-y-4">
                        {pieChartData.map((item, idx) => (
                            <div 
                                key={idx} 
                                className="relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 -mx-2 rounded-xl transition-colors group"
                                onClick={() => setSelectedCategoryForModal({ id: item.id, name: item.name, icon: item.icon })}
                            >
                                <div className="flex justify-between items-center mb-1 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm shadow-inner group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors">
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{formatCurrency(item.value)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ 
                                            width: `${Math.max(item.percent, 2)}%`, 
                                            backgroundColor: COLORS[idx % COLORS.length] 
                                        }}
                                    />
                                </div>
                                <div className="text-right mt-1">
                                    <span className="text-[11px] sm:text-xs font-bold text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item.percent.toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardChart;
