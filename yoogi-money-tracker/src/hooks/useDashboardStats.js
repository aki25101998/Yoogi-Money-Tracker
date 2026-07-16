import { useMemo } from 'react';

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8'];

export const useDashboardStats = ({
    transactions,
    localWallets,
    selectedWalletIds,
    dateRange,
    categories,
    chartType,
    selectedCategoryForModal
}) => {
    const walletBalances = useMemo(() => {
        const balances = {};
        localWallets.forEach(w => { balances[w.id] = { ...w, balance: w.initialBalance || 0 }; });
        
        transactions.forEach(t => {
            if (t.type === 'income' && balances[t.walletId]) {
                balances[t.walletId].balance += (t.amount || 0);
            } else if (t.type === 'expense' && balances[t.walletId]) {
                balances[t.walletId].balance -= (t.amount || 0);
            } else if (t.type === 'transfer') {
                if (balances[t.walletId]) balances[t.walletId].balance -= (t.amount || 0);
                if (t.transferTo && balances[t.transferTo]) balances[t.transferTo].balance += (t.amount || 0);
            } else if (t.type === 'loan_given' && balances[t.walletId]) {
                balances[t.walletId].balance -= (t.amount || 0);
            } else if (t.type === 'loan_repaid' && balances[t.walletId]) {
                balances[t.walletId].balance += (t.amount || 0);
            } else if (t.type === 'installment_repaid' && balances[t.walletId]) {
                balances[t.walletId].balance -= (t.amount || 0);
            }
        });
        return localWallets.map(w => balances[w.id]);
    }, [transactions, localWallets]);

    const totalBalance = useMemo(() => {
        if (selectedWalletIds.length === 0) {
            return walletBalances.reduce((sum, w) => sum + w.balance, 0);
        }
        return walletBalances
            .filter(w => selectedWalletIds.includes(w.id))
            .reduce((sum, w) => sum + w.balance, 0);
    }, [walletBalances, selectedWalletIds]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (!t.date) return false;
            if (selectedWalletIds.length > 0) {
                if (t.type === 'transfer') {
                    if (!selectedWalletIds.includes(t.walletId) && !selectedWalletIds.includes(t.transferTo)) return false;
                } else {
                    if (!selectedWalletIds.includes(t.walletId)) return false;
                }
            }

            const tDateOnly = t.date ? t.date.split('T')[0] : '';
            if (dateRange.start && tDateOnly < dateRange.start) return false;
            if (dateRange.end && tDateOnly > dateRange.end) return false;

            return true;
        });
    }, [transactions, dateRange, selectedWalletIds]);

    const summaryStats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);

    const pieChartData = useMemo(() => {
        const filteredByType = filteredTransactions.filter(t => t.type === chartType);
        const totalAmount = filteredByType.reduce((sum, t) => sum + (t.amount || 0), 0);

        const catMap = {};
        filteredByType.forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const catName = cat ? cat.name : 'Chưa phân loại';
            const catIcon = cat ? cat.icon : '❓';
            if (!catMap[catName]) catMap[catName] = { id: cat?.id || null, name: catName, icon: catIcon, value: 0 };
            catMap[catName].value += (t.amount || 0);
        });

        return Object.values(catMap)
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                percent: totalAmount > 0 ? (item.value / totalAmount) * 100 : 0,
                fill: COLORS[index % COLORS.length]
            }))
            .slice(0, 8); 
    }, [filteredTransactions, categories, chartType]);

    const categoryTransactions = useMemo(() => {
        if (!selectedCategoryForModal) return [];
        return filteredTransactions.filter(t => t.type === chartType && (
            selectedCategoryForModal.id ? t.categoryId === selectedCategoryForModal.id : !t.categoryId
        )).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [filteredTransactions, selectedCategoryForModal, chartType]);

    const recentTransactions = useMemo(() => filteredTransactions.slice(0, 5), [filteredTransactions]);

    return {
        walletBalances,
        totalBalance,
        filteredTransactions,
        summaryStats,
        pieChartData,
        categoryTransactions,
        recentTransactions
    };
};
