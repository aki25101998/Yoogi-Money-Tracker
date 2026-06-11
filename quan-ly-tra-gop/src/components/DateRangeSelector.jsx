import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, Check, ArrowRight } from 'lucide-react';

const MODE_LABELS = {
    day: 'Ngày',
    week: 'Tuần',
    month: 'Tháng',
    year: 'Năm',
    all: 'Mọi thời gian',
    custom: 'Tùy chỉnh'
};

const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date.setDate(diff));
    return start;
};

const formatDateToLocal = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

const DateRangeSelector = ({ initialMode = 'month', onChange }) => {
    const [mode, setMode] = useState(initialMode);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    const [isModeOpen, setIsModeOpen] = useState(false);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

    const modeRef = useRef(null);

    // Format helpers
    const getMonthLabel = (d) => `tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
    const getYearLabel = (d) => `${d.getFullYear()}`;
    const getDayLabel = (d) => {
        const days = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
        return `${days[d.getDay()]}, ${d.getDate()} thg ${d.getMonth() + 1}`;
    };
    const getWeekLabel = (d) => {
        const start = getStartOfWeek(d);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.getDate()} thg ${start.getMonth() + 1} - ${end.getDate()} thg ${end.getMonth() + 1}`;
    };

    // Calculate start and end strings based on current state
    useEffect(() => {
        let startStr = null;
        let endStr = null;
        let label = '';

        const d = currentDate;
        const y = d.getFullYear();
        const m = d.getMonth();

        switch (mode) {
            case 'day':
                startStr = formatDateToLocal(d);
                endStr = startStr;
                label = getDayLabel(d);
                break;
            case 'week':
                const startW = getStartOfWeek(d);
                const endW = new Date(startW);
                endW.setDate(endW.getDate() + 6);
                startStr = formatDateToLocal(startW);
                endStr = formatDateToLocal(endW);
                label = getWeekLabel(d);
                break;
            case 'month':
                const startM = new Date(y, m, 1);
                const endM = new Date(y, m + 1, 0);
                startStr = formatDateToLocal(startM);
                endStr = formatDateToLocal(endM);
                label = getMonthLabel(d);
                break;
            case 'year':
                const startY = new Date(y, 0, 1);
                const endY = new Date(y, 11, 31);
                startStr = formatDateToLocal(startY);
                endStr = formatDateToLocal(endY);
                label = getYearLabel(d);
                break;
            case 'custom':
                startStr = customRange.start;
                endStr = customRange.end;
                label = (startStr && endStr) ? `${startStr} - ${endStr}` : 'Chọn phạm vi';
                break;
            case 'all':
                startStr = null;
                endStr = null;
                label = 'Mọi thời gian';
                break;
            default:
                break;
        }

        if (onChange) {
            onChange({ start: startStr, end: endStr, mode, label });
        }
    }, [mode, currentDate, customRange]);

    // Handle clicks outside dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modeRef.current && !modeRef.current.contains(event.target)) setIsModeOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Quick chips for custom modal
    const setQuickRange = (type) => {
        const now = new Date();
        let start, end;
        if (type === 'this_week') {
            start = getStartOfWeek(now);
            end = new Date(start);
            end.setDate(end.getDate() + 6);
        } else if (type === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (type === 'last_30') {
            end = new Date(now);
            start = new Date(now);
            start.setDate(start.getDate() - 30);
        }
        setCustomRange({ start: formatDateToLocal(start), end: formatDateToLocal(end) });
    };

    // Value changes (simple native inputs hidden behind the label, or just let users use arrows, 
    // but the screenshot has a caret. Let's use a native input with opacity 0 over the button)
    const handleNativeChange = (e) => {
        const val = e.target.value;
        if (!val) return;
        if (mode === 'month') {
            // val is "YYYY-MM"
            const [yy, mm] = val.split('-');
            setCurrentDate(new Date(parseInt(yy), parseInt(mm) - 1, 1));
        } else if (mode === 'day') {
            setCurrentDate(new Date(val));
        } else if (mode === 'week') {
            // val is "YYYY-Www"
            // Simple approximation or just use standard logic
            // Since input type="week" is inconsistent, we can just use input type="date" and calculate the week
            setCurrentDate(new Date(val));
        }
    };

    const handleYearChange = (e) => {
        const y = parseInt(e.target.value);
        if (y) {
            const d = new Date(currentDate);
            d.setFullYear(y);
            setCurrentDate(d);
        }
    };

const YEARS = [2025, 2026, 2027, 2028];

    return (
        <div className="flex flex-wrap items-center gap-2 relative">
            {/* Tầng 1: Chọn Chế độ (Mode) */}
            <div className="relative" ref={modeRef}>
                <button 
                    onClick={() => setIsModeOpen(!isModeOpen)}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-slate-800 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">{MODE_LABELS[mode]}</span>
                    <Calendar size={18} className="text-slate-800 dark:text-white stroke-[2.5]" />
                    <ChevronDown size={16} className="text-slate-400 ml-1" />
                </button>

                {isModeOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        {Object.entries(MODE_LABELS).map(([k, v]) => (
                            <button
                                key={k}
                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${mode === k ? 'text-teal-600 dark:text-teal-400 font-semibold bg-teal-50/50 dark:bg-teal-900/20' : 'text-slate-700 dark:text-slate-300'}`}
                                onClick={() => {
                                    setMode(k);
                                    setIsModeOpen(false);
                                    if (k === 'custom') setIsCustomModalOpen(true);
                                }}
                            >
                                {v}
                                {mode === k && <Check size={16} className="text-teal-600 dark:text-teal-400" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Tầng 2: Chọn Giá trị (Value) */}
            {mode !== 'all' && mode !== 'custom' && (
                <div className="relative group">
                    <button className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-slate-800 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm relative overflow-hidden">
                        <span>
                            {mode === 'month' && getMonthLabel(currentDate)}
                            {mode === 'day' && getDayLabel(currentDate)}
                            {mode === 'week' && getWeekLabel(currentDate)}
                            {mode === 'year' && getYearLabel(currentDate)}
                        </span>
                        <ChevronDown size={16} className="text-slate-400 ml-1" />
                        
                        {/* Hidden Native Inputs for quick picking without custom calendar UI */}
                        {mode === 'month' && (
                            <input 
                                type="month" 
                                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleNativeChange}
                                onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                            />
                        )}
                        {(mode === 'day' || mode === 'week') && (
                            <input 
                                type="date" 
                                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={handleNativeChange}
                                onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                            />
                        )}
                        {mode === 'year' && (
                            <select 
                                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                                value={currentDate.getFullYear()}
                                onChange={handleYearChange}
                            >
                                {YEARS.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        )}
                    </button>
                </div>
            )}

            {mode === 'custom' && (
                <button 
                    onClick={() => setIsCustomModalOpen(true)}
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-slate-800 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                    <span>{customRange.start && customRange.end ? `${customRange.start} - ${customRange.end}` : 'Chọn phạm vi...'}</span>
                </button>
            )}

            {/* Modal Chọn phạm vi */}
            {isCustomModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3">
                                <Calendar size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Chọn phạm vi</h3>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex-1 bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl p-3 relative overflow-hidden text-center">
                                <div className="flex items-center justify-center gap-1 text-teal-600 dark:text-teal-400 text-xs font-medium mb-1">
                                    Ngày bắt đầu
                                </div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-white">
                                    {customRange.start ? getDayLabel(new Date(customRange.start)) : 'Chưa chọn'}
                                </div>
                                <input 
                                    type="date" 
                                    value={customRange.start}
                                    onChange={(e) => setCustomRange(prev => ({...prev, start: e.target.value}))}
                                    onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                            </div>
                            <ArrowRight size={20} className="text-slate-300 dark:text-slate-600 shrink-0" />
                            <div className="flex-1 bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl p-3 relative overflow-hidden hover:bg-teal-100/50 dark:hover:bg-teal-900/40 transition-colors text-center">
                                <div className="flex items-center justify-center gap-1 text-teal-600 dark:text-teal-400 text-xs font-medium mb-1">
                                    Ngày kết thúc
                                </div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-white">
                                    {customRange.end ? getDayLabel(new Date(customRange.end)) : 'Chưa chọn'}
                                </div>
                                <input 
                                    type="date" 
                                    value={customRange.end}
                                    onChange={(e) => setCustomRange(prev => ({...prev, end: e.target.value}))}
                                    onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center mb-6">
                            <button onClick={() => setQuickRange('this_week')} className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Tuần này</button>
                            <button onClick={() => setQuickRange('this_month')} className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Tháng này</button>
                            <button onClick={() => setQuickRange('last_30')} className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">30 ngày qua</button>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsCustomModalOpen(false)}
                                className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => setIsCustomModalOpen(false)}
                                className="flex-[1.5] py-3.5 rounded-2xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 hover:bg-teal-600 transition-colors"
                            >
                                <Check size={18} strokeWidth={3} /> Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangeSelector;
