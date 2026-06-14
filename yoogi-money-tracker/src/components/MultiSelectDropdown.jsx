import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const MultiSelectDropdown = ({ options, selectedIds, onChange, placeholder, isGrouped = false, widthClass = "min-w-[160px]" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (id) => {
        if (id === 'all') {
            onChange([]);
            return;
        }
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(item => item !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const isAllSelected = selectedIds.length === 0;

    let displayLabel = placeholder;
    if (!isAllSelected) {
        if (selectedIds.length === 1) {
            let selectedItem = null;
            if (isGrouped) {
                for (const group of options) {
                    const item = group.options.find(o => o.id === selectedIds[0]);
                    if (item) { selectedItem = item; break; }
                }
            } else {
                selectedItem = options.find(o => o.id === selectedIds[0]);
            }
            if (selectedItem) displayLabel = selectedItem.icon ? `${selectedItem.icon} ${selectedItem.name}` : selectedItem.name;
        } else {
            displayLabel = `Đã chọn (${selectedIds.length})`;
        }
    }

    return (
        <div className={`relative group ${widthClass}`} ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between pl-4 pr-10 py-2 h-[42px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer hover:border-indigo-500 transition-all"
            >
                <span className="whitespace-nowrap pr-2">{displayLabel}</span>
                <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 min-w-max w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-[65vh] overflow-y-auto">
                    <div 
                        onClick={() => toggleSelection('all')}
                        className={`flex items-center px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isAllSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border rounded-md mr-3 ${isAllSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                            {isAllSelected && <Check size={14} className="text-white" />}
                        </div>
                        <span className="font-medium text-sm">Tất cả</span>
                    </div>

                    {isGrouped ? options.map((group, gIdx) => (
                        <div key={gIdx}>
                            <div className="px-4 py-2 font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700/50">
                                {group.label}
                            </div>
                            {group.options.map(opt => {
                                const isSelected = selectedIds.includes(opt.id);
                                return (
                                    <div 
                                        key={opt.id}
                                        onClick={() => toggleSelection(opt.id)}
                                        className={`flex items-center pl-8 pr-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border rounded-md mr-3 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <span className="text-sm whitespace-nowrap pr-4">{opt.icon && <span className="mr-2">{opt.icon}</span>}{opt.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )) : options.map(opt => {
                        const isSelected = selectedIds.includes(opt.id);
                        return (
                            <div 
                                key={opt.id}
                                onClick={() => toggleSelection(opt.id)}
                                className={`flex items-center px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}
                            >
                                <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center border rounded-md mr-3 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {isSelected && <Check size={14} className="text-white" />}
                                </div>
                                <span className="text-sm whitespace-nowrap pr-4">{opt.icon && <span className="mr-2">{opt.icon}</span>}{opt.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
