import React from 'react';
import MultiSelectDropdown from '../MultiSelectDropdown';
import DateRangeSelector from '../DateRangeSelector';

const TransactionFilters = ({
    wallets, selectedWalletIds, setSelectedWalletIds,
    categories, selectedCategoryIds, setSelectedCategoryIds,
    selectedSubcategoryIds, setSelectedSubcategoryIds,
    setDateRange, userSettings
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm relative md:sticky top-0 z-20">
            <div className="flex flex-col md:flex-row flex-wrap md:items-center justify-center gap-3">
                <MultiSelectDropdown
                    placeholder="🏦 Tất cả ví"
                    options={wallets || []}
                    selectedIds={selectedWalletIds}
                    onChange={setSelectedWalletIds}
                    widthClass="w-full md:min-w-[160px] md:w-auto"
                />

                <div className="flex flex-col md:flex-row flex-wrap justify-center gap-3 w-full md:w-auto">
                    <MultiSelectDropdown
                        placeholder="📂 Tất cả danh mục chính"
                        isGrouped={true}
                        options={[
                            { label: 'Chi tiêu', options: categories?.filter(c => c.type === 'expense') || [] },
                            { label: 'Thu nhập', options: categories?.filter(c => c.type === 'income') || [] }
                        ]}
                        selectedIds={selectedCategoryIds}
                        onChange={(ids) => {
                            setSelectedCategoryIds(ids);
                            setSelectedSubcategoryIds([]);
                        }}
                        widthClass="w-full md:min-w-[180px] md:w-auto"
                    />

                    <MultiSelectDropdown
                        placeholder="Tất cả danh mục phụ"
                        isGrouped={true}
                        options={(() => {
                            const filtered = categories?.filter(c => selectedCategoryIds.length === 0 || selectedCategoryIds.includes(c.id)) || [];
                            const expenseGroups = filtered.filter(c => c.type === 'expense').map(c => ({
                                label: c.name,
                                options: c.subcategories?.map(s => ({ id: s.id, name: s.name })) || []
                            })).filter(group => group.options.length > 0);
                            if (expenseGroups.length > 0) expenseGroups[0].superLabel = <span className="text-rose-600 dark:text-rose-400">CHI TIÊU</span>;

                            const incomeGroups = filtered.filter(c => c.type === 'income').map(c => ({
                                label: c.name,
                                options: c.subcategories?.map(s => ({ id: s.id, name: s.name })) || []
                            })).filter(group => group.options.length > 0);
                            if (incomeGroups.length > 0) incomeGroups[0].superLabel = <span className="text-emerald-600 dark:text-emerald-400">THU NHẬP</span>;

                            return [...expenseGroups, ...incomeGroups];
                        })()}
                        selectedIds={selectedSubcategoryIds}
                        onChange={setSelectedSubcategoryIds}
                        widthClass="w-full md:min-w-[160px] md:w-auto"
                    />
                </div>
                <div className="w-full md:w-auto flex justify-center">
                    <DateRangeSelector 
                        initialMode="month" 
                        onChange={(range) => setDateRange(range)} 
                        userSettings={userSettings}
                    />
                </div>
            </div>
        </div>
    );
};

export default TransactionFilters;
