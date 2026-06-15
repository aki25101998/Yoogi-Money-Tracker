import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Plus, CreditCard, Calendar, TrendingUp, Target,
    Loader2, Filter, FileJson, Upload,
    Sparkles, X, AlertTriangle, Trash2,
    RotateCcw, ChevronUp, ChevronDown, Check
} from 'lucide-react';
import {
    collection, addDoc, deleteDoc, updateDoc, doc,
    onSnapshot, query
} from 'firebase/firestore';

import { db, APP_ID } from '../config/firebase';
import { addPayer, deletePayer, addLender, deleteLender } from '../utils/firebaseHelpers';
import { formatCurrency } from '../utils/formatters';
import { calculateLoan, calculateItemStats, getYearMonth } from '../utils/calculations';

import Card from '../components/ui/Card';
import InstallmentItem from '../components/InstallmentItem';
import AddEditModal from '../components/modals/AddEditModal';
import ConfirmModal from '../components/modals/ConfirmModal';

const InstallmentsPage = ({ user, items, payers, lenders, isLoading }) => {
    // Modal States
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Confirm Modal States
    const [confirmModalState, setConfirmModalState] = useState({
        isOpen: false,
        type: null,
        data: null,
        title: '',
        description: '',
        confirmVariant: 'primary'
    });

    const [isProcessing, setIsProcessing] = useState(false);

    // AI & UI State
    const [aiAdvice, setAiAdvice] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAdvice, setShowAdvice] = useState(false);

    // Filter State
    const [filterOwner, setFilterOwner] = useState('all');
    const [filterDate, setFilterDate] = useState('');
    const [hideCompleted, setHideCompleted] = useState(false);
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'history'

    // Refs
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null);

    // --- Derived State ---
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
                    const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'installments', item.id);
                    await updateDoc(docRef, { paidMonths: newPaidMonths });
                    console.log(`Auto-fixed item ${item.name}: ${item.paidMonths.length} -> ${item.term}`);
                } catch (e) {
                    console.error("Auto-fix error:", e);
                }
            }
        });
    }, [items, user]);

    const activeReferenceDate = useMemo(() => {
        if (filterDate) {
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
                    if (!filterDate || month === filterDate) {
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

            if (filterDate) {
                // Nếu đang dùng bộ lọc để xem 1 tháng cụ thể: CHỈ HIỆN giao dịch của đúng tháng đó
                if (monthsDiff < item.term) {
                    const isPaid = item.paidMonths?.includes(targetMonthStr);
                    if (isPaid) {
                        completed.push({ item, monthStr: targetMonthStr, index: monthsDiff + 1, refDate: targetDate });
                    } else {
                        inProgress.push({ item, monthStr: targetMonthStr, index: monthsDiff + 1, refDate: targetDate });
                    }
                }
            } else {
                // Nếu ở chế độ mặc định (Tháng hiện tại): CỘNG DỒN tất cả giao dịch chưa trả từ quá khứ
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
        const targetDate = activeReferenceDate;

        // Calculate global remaining total based on ALL items
        // It uses absolute total payments made, ignoring the calendar month
        const today = new Date();
        filteredItems.forEach(item => {
            let effectiveMonths = 0;
            if (Array.isArray(item.paidMonths)) {
                effectiveMonths = Math.min(item.paidMonths.length, item.term);
            } else {
                // Fallback for old data without paidMonths array
                const start = new Date(item.startDate);
                let monthsPassed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
                if (today < start) monthsPassed = 0;
                effectiveMonths = Math.min(monthsPassed, item.term);
            }
            
            const paidAmount = effectiveMonths * item.monthlyPayment;
            remainingTotal += (item.totalPayable - paidAmount);

            // Calculate Projected Remaining Debt based strictly on schedule
            const start = new Date(item.startDate);
            const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            let monthsDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
            if (monthsDiff < 0) monthsDiff = 0;
            
            const projectedPayments = Math.min(monthsDiff, item.term);
            const projectedPaidAmount = projectedPayments * item.monthlyPayment;
            projectedRemainingTotal += (item.totalPayable - projectedPaidAmount);
        });

        // Calculate monthly total for the currently viewed month (unpaid items only)
        inProgressItems.forEach(wrapper => {
            monthlyTotal += wrapper.item.monthlyPayment;
        });

        return { monthlyTotal, remainingTotal, projectedRemainingTotal };
    }, [filteredItems, inProgressItems, activeReferenceDate]);

    // --- Handlers ---
    const handleOpenAdd = () => { setEditingItem(null); setIsAddEditModalOpen(true); };
    const handleOpenEdit = (item) => { setEditingItem(item); setIsAddEditModalOpen(true); };

    const handleSaveItem = async (formData) => {
        const amount = parseFloat(formData.amount);
        const term = parseInt(formData.term);
        const rate = parseFloat(formData.rate);
        const monthlyPayment = calculateLoan(amount, rate, term);
        const itemData = {
            name: formData.name,
            originalAmount: amount,
            term, rate,
            startDate: formData.startDate,
            owner: formData.owner || 'Tôi',
            lender: formData.lender || '',
            monthlyPayment,
            totalPayable: monthlyPayment * term,
            paidMonths: formData.paidMonths || [],
        };
        if (user) {
            try {
                if (editingItem) {
                    const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'installments', editingItem.id);
                    await updateDoc(docRef, { ...itemData, updatedAt: new Date().toISOString() });
                } else {
                    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'installments'), {
                        ...itemData, createdAt: new Date().toISOString()
                    });
                }
            } catch (err) {
                alert("Lỗi kết nối Cloud. Vui lòng thử lại.");
            }
        }
        setIsAddEditModalOpen(false);
        setEditingItem(null);
    };

    const togglePaidForMonth = async (item, monthStr) => {
        if (!user) return;
        const currentPaidMonths = item.paidMonths || [];
        const isPaid = currentPaidMonths.includes(monthStr);
        let newPaidMonths;
        if (isPaid) {
            newPaidMonths = currentPaidMonths.filter(m => m !== monthStr);
        } else {
            newPaidMonths = [...currentPaidMonths, monthStr].sort();
        }
        try {
            const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'installments', item.id);
            await updateDoc(docRef, { paidMonths: newPaidMonths });
        } catch (err) {
            alert("Lỗi cập nhật trạng thái: " + err.message);
        }
    };

    const confirmDelete = (id) => {
        setConfirmModalState({
            isOpen: true, type: 'delete', data: id,
            title: 'Xác nhận xóa?',
            description: 'Bạn có chắc muốn xóa khoản này không?',
            confirmVariant: 'danger',
            icon: AlertTriangle,
            iconColorClass: "text-rose-600",
            iconBgClass: "bg-rose-100"
        });
    };

    const executeDelete = async () => {
        const id = confirmModalState.data;
        if (!id) return;
        setIsProcessing(true);
        if (user) {
            try {
                await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'installments', id));
            } catch (err) { console.error(err); }
        }
        setIsProcessing(false);
        setConfirmModalState({ ...confirmModalState, isOpen: false });
    };

    const confirmDeletePayer = (ownerName) => {
        const payerObj = payers?.find(p => p.name === ownerName);
        if (!payerObj) return;

        setConfirmModalState({
            isOpen: true,
            type: 'delete_payer',
            data: { payerId: payerObj.id, ownerName },
            title: 'Xóa người trả này?',
            description: `Bạn có chắc muốn xóa "${ownerName}" không? TOÀN BỘ các khoản trả góp của người này cũng sẽ bị XÓA VĨNH VIỄN. Hành động này không thể hoàn tác.`,
            confirmVariant: 'danger',
            icon: AlertTriangle,
            iconColorClass: "text-rose-600",
            iconBgClass: "bg-rose-100"
        });
    };

    const executeDeletePayer = async () => {
        const { payerId, ownerName } = confirmModalState.data;
        if (!payerId) return;
        setIsProcessing(true);
        if (user) {
            try {
                await deletePayer(user.uid, payerId);
                const itemsToDelete = items.filter(item => item.owner === ownerName);
                for (const item of itemsToDelete) {
                    await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'installments', item.id));
                }
                setFilterOwner('all');
            } catch (err) {
                console.error(err);
                alert("Lỗi khi xóa người trả: " + err.message);
            }
        }
        setIsProcessing(false);
        setConfirmModalState({ ...confirmModalState, isOpen: false });
    };

    const confirmDeleteLender = (lenderName) => {
        const lenderObj = lenders?.find(l => l.name === lenderName);
        if (!lenderObj) return;

        setConfirmModalState({
            isOpen: true,
            type: 'delete_lender',
            data: { lenderId: lenderObj.id, lenderName },
            title: 'Xóa đơn vị này?',
            description: `Bạn có chắc muốn xóa đơn vị "${lenderName}" không? LƯU Ý: Các khoản trả góp của đơn vị này sẽ không bị xóa, nhưng sẽ bị mất tên đơn vị.`,
            confirmVariant: 'danger',
            icon: AlertTriangle,
            iconColorClass: "text-rose-600",
            iconBgClass: "bg-rose-100"
        });
    };

    const executeDeleteLender = async () => {
        const { lenderId, lenderName } = confirmModalState.data;
        if (!lenderId) return;
        setIsProcessing(true);
        if (user) {
            try {
                await deleteLender(user.uid, lenderId);
                // We optionally could update items to remove lender name, but it's fine.
            } catch (err) {
                console.error(err);
                alert("Lỗi khi xóa đơn vị: " + err.message);
            }
        }
        setIsProcessing(false);
        setConfirmModalState({ ...confirmModalState, isOpen: false });
    };

    const handleExportJSON = () => {
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_tra_gop_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportJSON = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedItems = JSON.parse(e.target.result);
                if (!Array.isArray(importedItems)) throw new Error("Format không hợp lệ.");
                setConfirmModalState({
                    isOpen: true, type: 'import', data: importedItems,
                    title: 'Xác nhận nạp dữ liệu?',
                    description: `Tìm thấy ${importedItems.length} khoản vay. Sẽ được thêm vào danh sách hiện tại.`,
                    confirmVariant: 'primary',
                    icon: Upload,
                    iconColorClass: "text-indigo-600",
                    iconBgClass: "bg-indigo-100"
                });
            } catch (err) { alert("Lỗi file: " + err.message); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const executeImport = async () => {
        const importedData = confirmModalState.data;
        if (!importedData) return;
        setIsProcessing(true);
        try {
            let successCount = 0;
            for (const item of importedData) {
                const { id, ...raw } = item;
                const amountVal = raw.originalAmount !== undefined ? raw.originalAmount : raw.amount;
                const amount = parseFloat(amountVal);
                const name = raw.name;
                const term = parseInt(raw.term) || 6;
                const rate = parseFloat(raw.rate) || 0;
                const startDate = raw.startDate || new Date().toISOString().split('T')[0];
                const owner = raw.owner || 'Tôi';
                if (name && !isNaN(amount) && amount > 0) {
                    const monthlyPayment = calculateLoan(amount, rate, term);
                    const totalPayable = monthlyPayment * term;
                    const cleanItem = { name, originalAmount: amount, term, rate, startDate, owner, monthlyPayment, totalPayable, createdAt: new Date().toISOString() };
                    if (user) {
                        await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'installments'), cleanItem);
                        successCount++;
                    }
                }
            }
            alert(`Đã nạp thành công ${successCount} khoản vay!`);
        } catch (e) {
            alert("Có lỗi xảy ra khi nạp dữ liệu: " + e.message);
        } finally {
            setIsProcessing(false);
            setConfirmModalState({ ...confirmModalState, isOpen: false });
        }
    };

    const handleConfirmAction = () => {
        if (confirmModalState.type === 'delete') executeDelete();
        else if (confirmModalState.type === 'import') executeImport();
        else if (confirmModalState.type === 'delete_payer') executeDeletePayer();
        else if (confirmModalState.type === 'delete_lender') executeDeleteLender();
    };

    const handleAnalyzeFinances = async () => {
        if (filteredItems.length === 0) return;
        setIsAnalyzing(true);
        setShowAdvice(true);
        setAiAdvice(null);
        try {
            const summaryData = filteredItems.map(item => {
                const stats = calculateItemStats(item);
                return { item: item.name, debt: Math.round(stats.remainingAmount), left: item.term - stats.effectiveMonths };
            }).filter(i => i.left > 0);

            const prompt = `Hãy đóng vai một Chuyên Gia Phân Tích Tài Chính Cấp Cao.\nDựa trên dữ liệu: ${JSON.stringify(summaryData)}.\nHãy lập BÁO CÁO TÀI CHÍNH NGẮN GỌN (tối đa 300 chữ) theo 3 phần:\n1. TỔNG QUAN DANH MỤC NỢ 📊\n2. KHUYẾN NGHỊ THANH KHOẢN 🎯\n3. GIẢI PHÁP TỐI ƯU DÒNG TIỀN 💡\nQUY TẮC TRÌNH BÀY (BẮT BUỘC TUÂN THỦ):\n⛔ CẤM TUYỆT ĐỐI dùng Markdown.\n⛔ KHÔNG dùng gạch đầu dòng.\n✅ Văn phong: Chuyên nghiệp, súc tích.\n✅ Chỉ dùng Emoji ở đầu câu.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GENERATIVE_AI_KEY || ""}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
            );
            const data = await response.json();
            setAiAdvice(data.candidates?.[0]?.content?.parts?.[0]?.text || "Lỗi AI.");
        } catch (error) {
            setAiAdvice("Hệ thống bận.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleQuickAddPayer = async () => {
        const name = window.prompt('Nhập tên người trả mới:');
        if (name && name.trim()) {
            try {
                await addPayer(user.uid, { name: name.trim() });
                setFilterOwner(name.trim());
                return name.trim();
            } catch (error) {
                alert('Lỗi: ' + error.message);
            }
        }
        return null;
    };

    const handleQuickAddLender = async () => {
        const name = window.prompt('Nhập tên đơn vị cho vay mới (Vd: TP Bank):');
        if (name && name.trim()) {
            try {
                await addLender(user.uid, { name: name.trim() });
                return name.trim();
            } catch (error) {
                alert('Lỗi: ' + error.message);
            }
        }
        return null;
    };

    // --- Render Helpers ---
    const renderGroupedItems = (itemsList, isCompleted) => {
        if (itemsList.length === 0) {
            return (
                <div className="text-center py-10 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                    <p className="text-slate-400 dark:text-slate-500 text-sm">Chưa có mục nào.</p>
                </div>
            );
        }
        
        // Group by lender
        const groups = {};
        itemsList.forEach(wrapper => {
            const lenderName = wrapper.item.lender || 'Khác';
            if (!groups[lenderName]) groups[lenderName] = [];
            groups[lenderName].push(wrapper);
        });

        return Object.entries(groups).map(([lenderName, itemsInGroup]) => (
            <div key={lenderName} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {lenderName}
                    </span>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                </div>
                <div className="space-y-3">
                    {itemsInGroup.map(wrapper => (
                        <InstallmentItem
                            key={`${wrapper.item.id}-${wrapper.monthStr}`}
                            item={wrapper.item}
                            onEdit={() => { setEditingItem(wrapper.item); setIsAddEditModalOpen(true); }}
                            onDelete={confirmDelete}
                            referenceDate={wrapper.refDate}
                            isPaid={isCompleted}
                            onTogglePaid={(item) => togglePaidForMonth(item, wrapper.monthStr)}
                            isReadOnly={false}
                            kyIndex={wrapper.index}
                        />
                    ))}
                </div>
            </div>
        ));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-500" />
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex gap-2">
                    <div className="relative flex items-center">
                        <div className="relative group">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-700">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span className="whitespace-nowrap">Người trả:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[100px]">{filterOwner === 'all' ? 'Tất cả' : filterOwner}</span>
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                            </div>
                            <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                                {uniqueOwners.map(owner => <option key={owner} value={owner}>{owner === 'all' ? 'Tất cả' : owner}</option>)}
                            </select>
                        </div>
                        {filterOwner !== 'all' && filterOwner !== 'Tôi' && (
                            <button 
                                onClick={() => confirmDeletePayer(filterOwner)}
                                className="ml-2 z-20 flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-500 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors shadow-sm"
                                title="Xóa người trả"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={handleQuickAddPayer} 
                        className="flex items-center justify-center px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors"
                        title="Thêm người trả mới"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex gap-2 ml-auto items-center">
                    <div className="relative group">
                        <div onClick={() => dateInputRef.current?.showPicker()} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer select-none ${filterDate ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <Calendar className={`w-3.5 h-3.5 ${filterDate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                            <span>{filterDate ? `Tháng ${filterDate.split('-').reverse().join('/')}` : 'Chọn tháng'}</span>
                        </div>
                        <input ref={dateInputRef} type="month" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="absolute start-0 bottom-0 w-0 h-0 opacity-0 -z-10 border-0 p-0 m-0" />
                        {filterDate && <button onClick={(e) => { e.stopPropagation(); setFilterDate(''); }} className="absolute -right-2 -top-2 z-20 bg-white dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-full p-0.5 shadow-sm border border-slate-200 dark:border-slate-600 hover:scale-110 transition-transform"><X className="w-3 h-3" /></button>}
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium transition-colors"><Upload className="w-3.5 h-3.5" /><span className="hidden md:inline">Nạp</span></button>
                    <button onClick={handleExportJSON} className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium transition-colors"><FileJson className="w-3.5 h-3.5" /><span className="hidden md:inline">Sao lưu</span></button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button onClick={handleOpenAdd} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm shadow-indigo-200 dark:shadow-none"><Plus className="w-3.5 h-3.5" /> Thêm mới</button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="p-5 bg-gradient-to-br from-indigo-600 to-violet-600 border-none text-white relative overflow-hidden shadow-lg">
                    <div className="relative z-10 flex items-start justify-between">
                        <div>
                            <p className="text-indigo-100 text-xs uppercase tracking-wider font-bold mb-1 opacity-90">Phải trả tháng này</p>
                            <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(totalStats.monthlyTotal)}</h2>
                        </div>
                        <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm"><Calendar className="w-6 h-6 text-white" /></div>
                    </div>
                </Card>
                <Card className="p-5 relative overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 transition-colors">
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">
                                Dư nợ dự kiến T{activeReferenceDate.getMonth() + 1}/{activeReferenceDate.getFullYear()}
                            </p>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalStats.projectedRemainingTotal)}</h2>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800"><Target className="w-6 h-6 text-emerald-500 dark:text-emerald-400" /></div>
                    </div>
                </Card>
                <Card className="p-5 relative overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 transition-colors">
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Tổng nợ thực tế hiện tại</p>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalStats.remainingTotal)}</h2>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl"><TrendingUp className="w-6 h-6 text-slate-500 dark:text-slate-300" /></div>
                    </div>
                </Card>
            </div>

            {/* AI Section */}
            {filteredItems.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 overflow-hidden transition-colors mb-6">
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                        <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><h3 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">AI Phân Tích</h3></div>
                        <div className="flex gap-2">
                            {showAdvice ? (
                                <>
                                    <button onClick={handleAnalyzeFinances} disabled={isAnalyzing} className="text-xs bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 font-medium flex items-center gap-1 shadow-sm disabled:opacity-50"><RotateCcw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Phân tích lại</span></button>
                                    <button onClick={() => setShowAdvice(false)} className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 font-medium flex items-center gap-1 shadow-sm"><ChevronUp className="w-3 h-3" /><span className="hidden sm:inline">Thu gọn</span></button>
                                </>
                            ) : (
                                <button onClick={handleAnalyzeFinances} className="text-xs bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 font-medium flex items-center gap-1 shadow-sm"><Sparkles className="w-3 h-3" /> Phân tích ngay</button>
                            )}
                        </div>
                    </div>
                    {showAdvice && <div className="p-5 bg-gradient-to-b from-white to-indigo-50/20 dark:from-slate-800 dark:to-slate-900">{isAnalyzing ? <div className="flex items-center justify-center py-2 text-slate-500 dark:text-slate-400 gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Đang suy nghĩ...</div> : <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{aiAdvice}</div>}</div>}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto hide-scrollbar">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'list' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Danh sách trả góp
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Lịch sử thanh toán
                </button>
                <button 
                    onClick={() => setActiveTab('lenders')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'lenders' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Đơn vị cho vay
                </button>
            </div>

            {/* Main Content Area */}
            {activeTab === 'list' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-indigo-400 border-l-4 border-indigo-400 pl-2 tracking-wider flex items-center justify-between mb-4">
                            <span>Đang chờ thanh toán ({inProgressItems.length})</span>
                        </h2>
                        {renderGroupedItems(inProgressItems, false)}
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-emerald-500 border-l-4 border-emerald-500 pl-2 tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span>Đã hoàn thành ({completedItems.length})</span>
                                {completedItems.length > 0 && (
                                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">
                                        {formatCurrency(completedItems.reduce((sum, wrapper) => sum + wrapper.item.monthlyPayment, 0))}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <input type="checkbox" id="hideCompleted" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600 dark:checked:bg-emerald-500" />
                                <label htmlFor="hideCompleted" className="text-xs font-normal text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">Ẩn danh sách</label>
                            </div>
                        </h2>
                        {completedItems.length === 0 ? (
                            <div className="text-center py-10 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                <p className="text-slate-400 dark:text-slate-500 text-sm">Chưa có mục nào hoàn thành.</p>
                            </div>
                        ) : hideCompleted ? (
                            <div className="text-center py-6 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex-1 flex items-center justify-center">
                                <p className="text-slate-400 dark:text-slate-500 font-medium text-xs">Đã ẩn {completedItems.length} khoản vay hoàn thành.</p>
                            </div>
                        ) : (
                            renderGroupedItems(completedItems, true)
                        )}
                    </div>
                </div>
            ) : activeTab === 'lenders' ? (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={handleQuickAddLender} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm">
                            <Plus className="w-4 h-4" /> Thêm đơn vị
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {lenders && lenders.length > 0 ? lenders.map(lender => (
                            <div key={lender.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                                        {lender.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">{lender.name}</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => confirmDeleteLender(lender.name)}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )) : (
                            <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-slate-400 font-medium">Chưa có đơn vị cho vay nào.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {paymentHistoryGroups.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Chưa có lịch sử thanh toán nào.</p>
                        </div>
                    ) : (
                        paymentHistoryGroups.map(group => {
                            const [y, m] = group.month.split('-');
                            return (
                                <div key={group.month} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                    {/* Group Header */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-700 dark:text-slate-300">
                                            Kỳ tháng {m}/{y}
                                        </h3>
                                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(group.total)}
                                        </div>
                                    </div>
                                    
                                    {/* Group Items */}
                                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {group.items.map(txn => {
                                            const paidCount = Array.isArray(txn.item.paidMonths) ? Math.min(txn.item.paidMonths.length, txn.item.term) : 0;
                                            const remaining = Math.max(0, txn.item.term - paidCount);
                                            const progress = Math.round((paidCount / txn.item.term) * 100);
                                            return (
                                            <div 
                                                key={txn.id} 
                                                className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                                onClick={() => { setEditingItem(txn.item); setIsAddEditModalOpen(true); }}
                                            >
                                                {/* Icon */}
                                                <div className="w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center text-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm">
                                                    💳
                                                </div>
                                                
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-white truncate text-base">{txn.itemName}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                        <span>Người trả: {txn.owner}</span>
                                                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">Đã trả: {paidCount}/{txn.item.term} kỳ ({progress}%)</span>
                                                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                                                        <span className="font-medium text-rose-500">Còn lại: {remaining} kỳ</span>
                                                    </div>
                                                </div>

                                                {/* Amount & Actions */}
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(txn.amount)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); togglePaidForMonth(txn.item, txn.month); }}
                                                            title="Hoàn tác (Đánh dấu chưa trả)"
                                                            className="p-2 text-slate-400 hover:text-rose-500 bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 rounded-lg transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modals */}
            <AddEditModal
                isOpen={isAddEditModalOpen}
                onClose={() => setIsAddEditModalOpen(false)}
                onSave={handleSaveItem}
                editingItem={editingItem}
                uniqueOwners={payers}
                onAddPayer={handleQuickAddPayer}
                lenders={lenders}
                onAddLender={handleQuickAddLender}
            />
            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmModalState.title}
                description={confirmModalState.description}
                confirmText="Xác nhận"
                confirmVariant={confirmModalState.confirmVariant}
                isProcessing={isProcessing}
                Icon={confirmModalState.icon}
                iconColorClass={confirmModalState.iconColorClass}
                iconBgClass={confirmModalState.iconBgClass}
            />
        </>
    );
};

export default InstallmentsPage;
