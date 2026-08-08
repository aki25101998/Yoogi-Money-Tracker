import { useMemo, useEffect } from 'react';
import { calculateItemStats, getYearMonth } from '../utils/calculations';
import { updateInstallment } from '../utils/supabaseHelpers';

export const useInstallments = ({
    items,
    payers,
    user,
    filterOwner,
    filterDate,
    selectedLenderName,
    transactions
}) => {
    const uniqueOwners = useMemo(() => {
        return ['all', ...(payers?.map(p => p.name) || [])];
    }, [payers]);

    // Auto-fix data hook: Remove over-ticked months
    useEffect(() => {
        if (!user || items.length === 0) return;
        items.forEach(async (item) => {
            if (Array.isArray(item.paidMonths) && item.paidMonths.length > item.term) {
                const newPaidMonths = item.paidMonths.slice(0, item.term);
                try {
                    await updateInstallment(user.uid, item.id, { paidMonths: newPaidMonths });
                    console.log(`Auto-fixed item ${item.name}: ${item.paidMonths.length} -> ${item.term}`);
                } catch (e) {
                    console.error("Auto-fix error:", e);
                }
            }
        });
    }, [items, user]);

    const activeReferenceDate = useMemo(() => {
        if (filterDate && filterDate.length === 7) {
            const [y, m] = filterDate.split('-').map(Number);
            return new Date(y, m - 1, 1);
        }
        return new Date();
    }, [filterDate]);

    const filteredItems = useMemo(() => {
        let result = items;
        if (filterOwner !== 'all') {
            result = result.filter(item => (item.owner || 'Tôi') === filterOwner);
        }
        return result;
    }, [items, filterOwner]);

    const paymentHistoryGroups = useMemo(() => {
        const history = [];
        filteredItems.forEach(item => {
            if (Array.isArray(item.paidMonths)) {
                item.paidMonths.forEach(month => {
                    let match = false;
                    if (!filterDate) match = true;
                    else if (filterDate.length === 4) match = month.startsWith(filterDate);
                    else if (filterDate.length === 7) match = month === filterDate;
                    
                    if (match) {
                        history.push({
                            id: `${item.id}-${month}`,
                            item: item,
                            itemName: item.name,
                            owner: item.owner,
                            month: month,
                            amount: item.monthlyPayment
                        });
                    }
                });
            }
        });
        
        const groups = {};
        history.forEach(txn => {
            if (!groups[txn.month]) {
                groups[txn.month] = { month: txn.month, total: 0, items: [] };
            }
            groups[txn.month].items.push(txn);
            groups[txn.month].total += txn.amount;
        });
        
        return Object.values(groups).sort((a, b) => b.month.localeCompare(a.month));
    }, [filteredItems, filterDate]);

    const groupedLenders = useMemo(() => {
        const groups = {};
        
        filteredItems.forEach(item => {
            const lenderName = item.lender || 'Khác';
            if (!groups[lenderName]) {
                groups[lenderName] = {
                    lenderName,
                    totalAmount: 0,
                    repaidAmount: 0,
                    items: [],
                    status: 'paid'
                };
            }
            
            groups[lenderName].items.push(item);
            
            const stats = calculateItemStats(item, new Date(), transactions);
            
            if (!stats.isFinished) {
                groups[lenderName].totalAmount += item.totalPayable;
                groups[lenderName].repaidAmount += stats.paidAmount;
                groups[lenderName].status = 'active';
            }
        });
        
        return Object.values(groups).sort((a, b) => {
            const aActive = a.status === 'active';
            const bActive = b.status === 'active';
            if (aActive !== bActive) return aActive ? -1 : 1;
            return b.totalAmount - a.totalAmount;
        });
    }, [filteredItems, transactions]);

    const { inProgressItems, completedItems } = useMemo(() => {
        const targetDate = activeReferenceDate;
        const targetMonthStr = getYearMonth(targetDate);
        const inProgress = [];
        const completed = [];
        
        filteredItems.forEach(item => {
            const start = new Date(item.startDate);
            const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            const monthsDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
            
            if (monthsDiff < 0) return;

            if (filterDate && filterDate.length === 7) {
                if (monthsDiff < item.term) {
                    const isPaid = item.paidMonths?.includes(targetMonthStr);
                    if (isPaid) {
                        completed.push({ item, monthStr: targetMonthStr, index: monthsDiff + 1, refDate: targetDate });
                    } else {
                        inProgress.push({ item, monthStr: targetMonthStr, index: monthsDiff + 1, refDate: targetDate });
                    }
                }
            } else {
                const maxCheckMonth = Math.min(monthsDiff, item.term - 1);
                
                for (let i = 0; i <= maxCheckMonth; i++) {
                    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
                    const mStr = getYearMonth(d);
                    const isPaid = item.paidMonths?.includes(mStr);
                    
                    if (isPaid && mStr === targetMonthStr) {
                        completed.push({ item, monthStr: mStr, index: i + 1, refDate: d });
                    } else if (!isPaid) {
                        inProgress.push({ item, monthStr: mStr, index: i + 1, refDate: d });
                    }
                }
            }
        });
        
        inProgress.sort((a, b) => a.monthStr.localeCompare(b.monthStr));
        
        return { inProgressItems: inProgress, completedItems: completed };
    }, [filteredItems, activeReferenceDate, filterDate]);

    const totalStats = useMemo(() => {
        let monthlyTotal = 0;
        let remainingTotal = 0;
        let projectedRemainingTotal = 0;
        let periodPaidTotal = 0;
        const targetDate = activeReferenceDate;

        filteredItems.forEach(item => {
            const stats = calculateItemStats(item, targetDate, transactions);
            
            // Add up periodPaidTotal manually for the specific filterDate if needed
            if (Array.isArray(item.paidMonths)) {
                item.paidMonths.forEach(month => {
                    let match = false;
                    if (!filterDate) match = true;
                    else if (filterDate.length === 4) match = month.startsWith(filterDate);
                    else if (filterDate.length === 7) match = month === filterDate;
                    
                    if (match) {
                        periodPaidTotal += item.monthlyPayment;
                    }
                });
            }
            
            if (transactions && Array.isArray(transactions)) {
                const related = transactions.filter(t => t.type === 'installment_repaid' && (t.installmentId === item.id || (!t.installmentId && t.description?.startsWith(`Trả lẻ trả góp ${item.name}:`))));
                for (const t of related) {
                    const txMonthStr = t.date ? `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}` : null;
                    if (txMonthStr && !item.paidMonths?.includes(txMonthStr)) {
                        let match = false;
                        if (!filterDate) match = true;
                        else if (filterDate.length === 4) match = txMonthStr.startsWith(filterDate);
                        else if (filterDate.length === 7) match = txMonthStr === filterDate;
                        
                        if (match) {
                            periodPaidTotal += (t.amount || 0);
                        }
                    }
                }
            } else if (item.partialPayments) {
                for (const [month, amount] of Object.entries(item.partialPayments)) {
                    if (!item.paidMonths?.includes(month)) {
                        let match = false;
                        if (!filterDate) match = true;
                        else if (filterDate.length === 4) match = month.startsWith(filterDate);
                        else if (filterDate.length === 7) match = month === filterDate;
                        
                        if (match) {
                            periodPaidTotal += parseFloat(amount) || 0;
                        }
                    }
                }
            }
            
            remainingTotal += stats.remainingAmount;

            const start = new Date(item.startDate);
            const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            let monthsDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
            if (monthsDiff < 0) monthsDiff = 0;
            
            const projectedPayments = Math.min(monthsDiff, item.term);
            const projectedPaidAmount = projectedPayments * item.monthlyPayment;
            projectedRemainingTotal += (item.totalPayable - projectedPaidAmount);
        });

        inProgressItems.forEach(wrapper => {
            monthlyTotal += wrapper.item.monthlyPayment;
        });

        return { monthlyTotal, remainingTotal, projectedRemainingTotal, periodPaidTotal };
    }, [filteredItems, inProgressItems, activeReferenceDate, filterDate, transactions]);

    const currentLenderDetails = useMemo(() => {
        if (!selectedLenderName) return null;
        
        const lenderItems = filteredItems.filter(item => (item.lender || 'Khác') === selectedLenderName);

        return {
            lenderName: selectedLenderName,
            items: lenderItems
        };
    }, [selectedLenderName, filteredItems]);

    return {
        uniqueOwners,
        activeReferenceDate,
        filteredItems,
        paymentHistoryGroups,
        groupedLenders,
        inProgressItems,
        completedItems,
        totalStats,
        currentLenderDetails
    };
};
