import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { useInstallments } from '../hooks/useInstallments';
import { useInstallmentModals } from '../hooks/useInstallmentModals';
import {
    Plus, CreditCard, Calendar, TrendingUp, Target,
    Loader2, Filter, FileJson, Upload,
    Sparkles, X, AlertTriangle, Trash2,
    RotateCcw, ChevronUp, ChevronDown, Check, ChevronRight
} from 'lucide-react';

import { addPayer, deletePayer, addLender, deleteLender, updateLender, deleteTransaction, addInstallment, updateInstallment, deleteInstallment, addTransaction } from '../utils/supabaseHelpers';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../utils/formatters';
import { calculateLoan, calculateItemStats, getYearMonth } from '../utils/calculations';

import Card from '../components/ui/Card';
import InstallmentItem from '../components/InstallmentItem';
const AddEditModal = lazy(() => import('../components/modals/AddEditModal'));
const ConfirmModal = lazy(() => import('../components/modals/ConfirmModal'));
const InstallmentDetailsModal = lazy(() => import('../components/modals/InstallmentDetailsModal'));
const MinimumPaymentModal = lazy(() => import('../components/modals/MinimumPaymentModal'));
const LoanEditModal = lazy(() => import('../components/modals/LoanEditModal'));
const PayInstallmentModal = lazy(() => import('../components/modals/PayInstallmentModal'));

const InstallmentsPage = ({ user, items, payers, lenders, isLoading, wallets, transactions, categories }) => {
    const {
        isAddEditModalOpen, setIsAddEditModalOpen,
        editingItem, setEditingItem,
        initialLender, setInitialLender,
        openAddModal, openEditModal, closeAddEditModal,
        isDetailsOpen, setIsDetailsOpen,
        selectedLenderName, setSelectedLenderName,
        isMinPaymentOpen, setIsMinPaymentOpen,
        selectedMinPaymentItem, setSelectedMinPaymentItem,
        isLoanEditOpen, setIsLoanEditOpen,
        editingLoanTxn, setEditingLoanTxn,
        isPayInstallmentOpen, setIsPayInstallmentOpen,
        selectedItemsForPayment, setSelectedItemsForPayment,
        confirmModalState, setConfirmModalState,
        openConfirmModal, closeConfirmModal
    } = useInstallmentModals();

    const [isProcessing, setIsProcessing] = useState(false);

    // AI & UI State
    const [aiAdvice, setAiAdvice] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAdvice, setShowAdvice] = useState(false);

    // Filter State
    const [filterOwner, setFilterOwner] = useState('all');
    const [filterDate, setFilterDate] = useState(() => getYearMonth(new Date()));
    const [hideZeroLenders, setHideZeroLenders] = useState(true);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'history'

    // Refs
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null);

    // --- Derived State ---
    const {
        uniqueOwners,
        activeReferenceDate,
        filteredItems,
        paymentHistoryGroups,
        groupedLenders,
        inProgressItems,
        completedItems,
        totalStats,
        currentLenderDetails
    } = useInstallments({
        items,
        payers,
        user,
        filterOwner,
        filterDate,
        selectedLenderName
    });

    // --- Handlers ---
    const handleOpenAdd = () => openAddModal();
    const handleOpenEdit = (item) => openEditModal(item);
    const handleOpenAddWithLender = (lenderName) => {
        setEditingItem(null);
        setInitialLender(lenderName);
        setIsAddEditModalOpen(true);
    };

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
                    await updateInstallment(user.uid, editingItem.id, { ...itemData, updatedAt: new Date().toISOString() });
                } else {
                    await addInstallment(user.uid, {
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
            // Undo payment: delete related transactions
            const relatedTxns = transactions?.filter(t => {
                if (t.installmentId !== item.id || (t.type !== 'installment_repaid' && t.type !== 'loan_repaid')) return false;
                
                let txMonthStr = null;
                const match = t.description?.match(/\(T(\d{2})\/(\d{4})\)$/);
                if (match) {
                    txMonthStr = `${match[2]}-${match[1]}`;
                } else if (t.description?.match(/\(T(\d{2})\)$/)) {
                    const m = t.description.match(/\(T(\d{2})\)$/)[1];
                    txMonthStr = t.date ? `${new Date(t.date).getFullYear()}-${m}` : null;
                } else {
                    txMonthStr = t.date ? `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}` : null;
                }
                
                return txMonthStr === monthStr;
            }) || [];
            
            for (const t of relatedTxns) {
                try {
                    await deleteTransaction(user.uid, t.id, t);
                } catch(e) { console.error("Error deleting related txn", e); }
            }
        } else {
            newPaidMonths = [...currentPaidMonths, monthStr].sort();
        }
        try {
            await updateInstallment(user.uid, item.id, { paidMonths: newPaidMonths });
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
                await deleteInstallment(user.uid, id);
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
                    await deleteInstallment(user.uid, item.id);
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
                const startDate = raw.startDate || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                const owner = raw.owner || 'Tôi';
                if (name && !isNaN(amount) && amount > 0) {
                    const monthlyPayment = calculateLoan(amount, rate, term);
                    const totalPayable = monthlyPayment * term;
                    const cleanItem = { name, originalAmount: amount, term, rate, startDate, owner, monthlyPayment, totalPayable, createdAt: new Date().toISOString() };
                    if (user) {
                        await addInstallment(user.uid, cleanItem);
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

    const handleDeleteTxnRequest = (e, id) => {
        e.stopPropagation();
        setConfirmModalState({
            isOpen: true,
            type: 'delete_txn',
            data: id,
            title: 'Xóa giao dịch này?',
            description: 'Hành động này không thể hoàn tác.',
            confirmVariant: 'danger'
        });
    };

    const handleConfirmAction = () => {
        if (confirmModalState.type === 'delete') executeDelete();
        else if (confirmModalState.type === 'import') executeImport();
        else if (confirmModalState.type === 'delete_payer') executeDeletePayer();
        else if (confirmModalState.type === 'delete_lender') executeDeleteLender();
        else if (confirmModalState.type === 'delete_txn') executeDeleteTxn();
    };

    const executeDeleteTxn = async () => {
        if (!user || !confirmModalState.data) return;
        setIsProcessing(true);
        try {
            const txnToDelete = transactions?.find(t => t.id === confirmModalState.data);
            await deleteTransaction(user.uid, confirmModalState.data, txnToDelete);
            setIsLoanEditOpen(false);
            setEditingLoanTxn(null);
        } catch (error) {
            alert('Lỗi xóa giao dịch: ' + error.message);
        } finally {
            setIsProcessing(false);
            setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleAnalyzeFinances = async () => {
        if (filteredItems.length === 0) return;
        setIsAnalyzing(true);
        setShowAdvice(true);
        setAiAdvice(null);
        try {
            const summaryData = filteredItems.map(item => {
                const stats = calculateItemStats(item, new Date(), transactions);
                return { item: item.name, debt: Math.round(stats.remainingAmount), left: item.term - stats.effectiveMonths };
            }).filter(i => i.left > 0);

            const prompt = `Hãy đóng vai một Chuyên Gia Phân Tích Tài Chính Cấp Cao.\nDựa trên dữ liệu: ${JSON.stringify(summaryData)}.\nHãy lập BÁO CÁO TÀI CHÍNH NGẮN GỌN (tối đa 300 chữ) theo 3 phần:\n1. TỔNG QUAN DANH MỤC NỢ 📊\n2. KHUYẾN NGHỊ THANH KHOẢN 🎯\n3. GIẢI PHÁP TỐI ƯU DÒNG TIỀN 💡\nQUY TẮC TRÌNH BÀY (BẮT BUỘC TUÂN THỦ):\n⛔ CẤM TUYỆT ĐỐI dùng Markdown.\n⛔ KHÔNG dùng gạch đầu dòng.\n✅ Văn phong: Chuyên nghiệp, súc tích.\n✅ Chỉ dùng Emoji ở đầu câu.`;

            
            const { data, error } = await supabase.functions.invoke('gemini-ai', {
                body: {
                    action: 'analyze_installments',
                    payload: { contents: [{ parts: [{ text: prompt }] }] }
                }
            });
            if (error) throw error;
            setAiAdvice(data?.candidates?.[0]?.content?.parts?.[0]?.text || "Lỗi AI.");
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

    const handleRenameLender = async (e, group) => {
        e.stopPropagation();
        
        if (group.lenderName === 'Khác') {
            alert('Không thể đổi tên đơn vị "Khác".');
            return;
        }

        const newName = window.prompt(`Nhập tên mới cho đơn vị "${group.lenderName}":`, group.lenderName);
        if (!newName || newName.trim() === '' || newName.trim() === group.lenderName) return;

        const trimmedName = newName.trim();
        setIsProcessing(true);
        if (user) {
            try {
                // 1. Tìm lender id
                const lenderObj = lenders?.find(l => l.name === group.lenderName);
                if (lenderObj) {
                    await updateLender(user.uid, lenderObj.id, { name: trimmedName });
                } else {
                    await addLender(user.uid, { name: trimmedName });
                }

                // 2. Cập nhật tất cả các khoản trả góp của lender cũ sang lender mới
                const itemsToUpdate = items.filter(item => (item.lender || 'Khác') === group.lenderName);
                for (const item of itemsToUpdate) {
                    await updateInstallment(user.uid, item.id, { lender: trimmedName, updatedAt: new Date().toISOString() });
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi khi đổi tên đơn vị: " + err.message);
            }
        }
        setIsProcessing(false);
    };

    const openDetailsModal = (group) => {
        setSelectedLenderName(group.lenderName);
        setIsDetailsOpen(true);
    };

    const handleConfirmPayment = async (paymentData) => {
        if (!user) return;
        setIsProcessing(true);
        try {
            const { walletId, date, totalAmount, items: paidItems } = paymentData;

            // 1. Cập nhật paidMonths cho từng khoản
            for (const wrapper of paidItems) {
                const item = wrapper.item;
                const monthStr = wrapper.monthStr;
                const currentPaidMonths = item.paidMonths || [];
                if (!currentPaidMonths.includes(monthStr)) {
                    const newPaidMonths = [...currentPaidMonths, monthStr].sort();
                    await updateInstallment(user.uid, item.id, { paidMonths: newPaidMonths });
                }

                // 2. Tạo giao dịch tương ứng cho từng khoản
                const amountNum = item.monthlyPayment;
                if (amountNum > 0) {
                    const ownerName = item.owner || 'Tôi';
                    const isPaying = ownerName === 'Tôi';
                    const matchedCategoryId = isPaying 
                        ? (categories?.find(c => c.type === 'installment_repaid')?.id || 'tra_no_tra_gop') 
                        : (categories?.find(c => c.type === 'loan_repaid')?.id || 'loan_repaid');

                    const transactionData = {
                        type: isPaying ? 'installment_repaid' : 'loan_repaid',
                        amount: amountNum,
                        description: `Trả góp ${item.name} (T${monthStr.split('-')[1]}/${monthStr.split('-')[0]})`,
                        categoryId: matchedCategoryId,
                        subcategoryId: isPaying ? 'tra_gop' : '',
                        date: new Date(date).toISOString(),
                        time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
                        walletId: walletId,
                        installmentId: item.id
                    };
                    
                    await addTransaction(user.uid, transactionData);
                }
            }
        } catch (error) {
            alert('Lỗi khi thanh toán: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
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
                    <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-0.5 transition-colors">
                        <select 
                            value={!filterDate ? 'all' : filterDate.length === 4 ? 'year' : 'month'}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'all') setFilterDate('');
                                else if (val === 'year') setFilterDate(new Date().getFullYear().toString());
                                else setFilterDate(getYearMonth(new Date()));
                            }}
                            className="bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer border-r border-slate-200 dark:border-slate-700 py-1.5 px-2"
                        >
                            <option value="month">Theo tháng</option>
                            <option value="year">Theo năm</option>
                            <option value="all">Mọi thời gian</option>
                        </select>

                        {!filterDate && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Tất cả</span>
                            </div>
                        )}
                        
                        {filterDate && filterDate.length === 7 && (
                            <div className="relative flex items-center gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 rounded-r-md transition-colors" onClick={() => dateInputRef.current?.showPicker()}>
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    Tháng {filterDate.split('-').reverse().join('/')}
                                </span>
                                <input ref={dateInputRef} type="month" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="absolute start-0 bottom-0 w-0 h-0 opacity-0 -z-10 border-0 p-0 m-0" />
                            </div>
                        )}
                        
                        {filterDate && filterDate.length === 4 && (
                            <div className="relative flex items-center gap-1.5 px-2 py-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                <select 
                                    value={filterDate} 
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="bg-transparent text-xs font-medium text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer pr-1"
                                >
                                    {Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                        <option key={y} value={y.toString()}>Năm {y}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                    <button onClick={handleOpenAdd} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm shadow-indigo-200 dark:shadow-none"><Plus className="w-3.5 h-3.5" /> Thêm mới</button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="p-5 bg-gradient-to-br from-indigo-600 to-violet-600 border-none text-white relative overflow-hidden shadow-lg">
                    <div className="relative z-10 flex items-start justify-between">
                        {filterDate && filterDate.length === 7 ? (
                            <div>
                                <p className="text-indigo-100 text-xs uppercase tracking-wider font-bold mb-1 opacity-90">Phải trả tháng này</p>
                                <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(totalStats.monthlyTotal)}</h2>
                            </div>
                        ) : (
                            <div>
                                <p className="text-indigo-100 text-xs uppercase tracking-wider font-bold mb-1 opacity-90">
                                    {!filterDate ? 'Tổng đã thanh toán' : `Đã thanh toán năm ${filterDate}`}
                                </p>
                                <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(totalStats.periodPaidTotal)}</h2>
                            </div>
                        )}
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
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 mb-6">
                <div className="flex overflow-x-auto hide-scrollbar">
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
                {activeTab === 'list' && (
                    <label className="flex items-center gap-1.5 cursor-pointer group ml-4 pb-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${hideZeroLenders ? 'bg-indigo-500 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}>
                            {hideZeroLenders && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={hideZeroLenders} onChange={(e) => setHideZeroLenders(e.target.checked)} />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors whitespace-nowrap">Ẩn 0 đ</span>
                    </label>
                )}
            </div>

            {/* Main Content Area */}
            {activeTab === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                        const displayLenders = hideZeroLenders 
                            ? groupedLenders.filter(group => group.totalAmount > 0)
                            : groupedLenders;

                        if (displayLenders.length === 0) {
                            return (
                                <div className="col-span-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                        <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có khoản trả góp nào.</p>
                                </div>
                            );
                        }

                        return displayLenders.map(group => {
                            const remaining = group.totalAmount - group.repaidAmount;
                            const progress = group.totalAmount > 0 ? Math.round((group.repaidAmount / group.totalAmount) * 100) : 0;
                            const isPaid = group.status === 'paid';
                            
                            const activeCount = inProgressItems.filter(wrapper => (wrapper.item.lender || 'Khác') === group.lenderName).length;
                            const paidCount = completedItems.filter(wrapper => (wrapper.item.lender || 'Khác') === group.lenderName).length;

                            const amountDueThisMonth = inProgressItems
                                .filter(wrapper => (wrapper.item.lender || 'Khác') === group.lenderName)
                                .reduce((sum, wrapper) => sum + wrapper.item.monthlyPayment, 0);

                            return (
                                <div 
                                    key={group.lenderName} 
                                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group/card"
                                >
                                    <div 
                                        className="p-5 pb-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700"
                                        onClick={(e) => handleRenameLender(e, group)}
                                        title="Bấm để đổi tên đơn vị"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl group-hover/card:bg-indigo-200 transition-colors">
                                                {group.lenderName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg group-hover/card:text-indigo-600 transition-colors">{group.lenderName}</h3>
                                                    {(activeCount > 0 || paidCount > 0) && (
                                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap">
                                                            Đang nợ {activeCount} / {activeCount + paidCount} khoản
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">Bấm để đổi tên đơn vị</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div 
                                        className="p-5 pt-4 cursor-pointer flex-1 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        onClick={() => openDetailsModal(group)}
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm text-slate-500">Đã mượn</span>
                                                <span className="font-bold text-slate-800 dark:text-white text-lg">{formatCurrency(group.totalAmount)}</span>
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-xs mb-1.5">
                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Đã trả: {formatCurrency(group.repaidAmount)}</span>
                                                    <span className="font-medium text-slate-500">{progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                                    <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>

                                            {!isPaid && (
                                                <div className="pt-2 flex gap-2 border-t border-slate-100 dark:border-slate-700">
                                                    <div className="flex-1">
                                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">Còn nợ</span>
                                                        <span className="font-bold text-orange-500">{formatCurrency(remaining)}</span>
                                                    </div>
                                                    {amountDueThisMonth > 0 && (
                                                        <div className="flex-1 text-right">
                                                            <span className="text-[10px] uppercase tracking-wider text-indigo-400 dark:text-indigo-500 font-bold block mb-0.5">Tháng này</span>
                                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(amountDueThisMonth)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
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
                                    <div className="bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-700 dark:text-slate-300">
                                            Kỳ tháng {m}/{y}
                                        </h3>
                                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(group.total)}
                                        </div>
                                    </div>
                                    
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
                                                <div className="w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center text-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm">
                                                    💳
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-white truncate text-base">{txn.itemName}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                        <span>Người trả: {txn.owner}</span>
                                                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">Đã trả: {paidCount}/{txn.item.term} kỳ ({progress}%)</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(txn.amount)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); togglePaidForMonth(txn.item, txn.month); }}
                                                            title="Hoàn tác"
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
            <Suspense fallback={null}>
                {isAddEditModalOpen && (
                    <AddEditModal
                        isOpen={isAddEditModalOpen}
                        onClose={() => setIsAddEditModalOpen(false)}
                        onSave={handleSaveItem}
                        editingItem={editingItem}
                        uniqueOwners={payers}
                        onAddPayer={handleQuickAddPayer}
                        lenders={lenders}
                        onAddLender={handleQuickAddLender}
                        initialLender={initialLender}
                    />
                )}
                {confirmModalState.isOpen && (
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
                )}
                {isDetailsOpen && (
                    <InstallmentDetailsModal
                        isOpen={isDetailsOpen}
                        onClose={() => setIsDetailsOpen(false)}
                        groupedLender={currentLenderDetails}
                        onEditItem={(item) => {
                            setEditingItem(item);
                            setInitialLender('');
                            setIsAddEditModalOpen(true);
                            setIsDetailsOpen(false);
                        }}
                        onDeleteItem={confirmDelete}
                        onTogglePaid={togglePaidForMonth}
                        referenceDate={activeReferenceDate}
                        onAddNewItem={handleOpenAddWithLender}
                        onMinimumPayment={(item, monthStr) => {
                            setSelectedMinPaymentItem({ item, monthStr });
                            setIsMinPaymentOpen(true);
                        }}
                        transactions={transactions}
                        onEditTransaction={(txn) => {
                            setEditingLoanTxn(txn);
                            setIsLoanEditOpen(true);
                        }}
                        onPayInstallments={(items) => {
                            setSelectedItemsForPayment(items);
                            setIsPayInstallmentOpen(true);
                        }}
                    />
                )}
                {isMinPaymentOpen && (
                    <MinimumPaymentModal
                        isOpen={isMinPaymentOpen}
                        onClose={() => { setIsMinPaymentOpen(false); setSelectedMinPaymentItem(null); }}
                        user={user}
                        wallets={wallets}
                        item={selectedMinPaymentItem?.item}
                        monthStr={selectedMinPaymentItem?.monthStr}
                        categories={categories}
                    />
                )}
                {isLoanEditOpen && (
                    <LoanEditModal
                        isOpen={isLoanEditOpen}
                        onClose={() => {
                            setIsLoanEditOpen(false);
                            setEditingLoanTxn(null);
                        }}
                        transaction={editingLoanTxn}
                        user={user}
                        wallets={wallets}
                        onDeleteRequest={handleDeleteTxnRequest}
                    />
                )}
                {isPayInstallmentOpen && (
                    <PayInstallmentModal
                        isOpen={isPayInstallmentOpen}
                        onClose={() => { setIsPayInstallmentOpen(false); setSelectedItemsForPayment([]); }}
                        wallets={wallets}
                        selectedItems={selectedItemsForPayment}
                        onConfirm={handleConfirmPayment}
                    />
                )}
            </Suspense>
        </>
    );
};

export default InstallmentsPage;
