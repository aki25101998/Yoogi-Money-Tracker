import React, { useState, useMemo, useRef } from 'react';
import {
    Plus, CreditCard, Calendar, TrendingUp,
    Loader2, Filter, FileJson, Upload,
    Sparkles, X, AlertTriangle,
    RotateCcw, ChevronUp, ChevronDown, Check
} from 'lucide-react';
import {
    collection, addDoc, deleteDoc, updateDoc, doc,
    onSnapshot, query
} from 'firebase/firestore';

import { db, APP_ID } from '../config/firebase';
import { formatCurrency } from '../utils/formatters';
import { calculateLoan, calculateItemStats, getYearMonth } from '../utils/calculations';

import Card from '../components/ui/Card';
import InstallmentItem from '../components/InstallmentItem';
import AddEditModal from '../components/modals/AddEditModal';
import ConfirmModal from '../components/modals/ConfirmModal';

const InstallmentsPage = ({ user, items, payers, isLoading }) => {
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

    // Refs
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null);

    // --- Derived State ---
    const uniqueOwners = useMemo(() => {
        return ['all', ...(payers?.map(p => p.name) || [])];
    }, [payers]);

    const filteredItems = useMemo(() => {
        let result = items;
        if (filterOwner !== 'all') {
            result = result.filter(item => (item.owner || 'Tôi') === filterOwner);
        }
        if (filterDate) {
            const [y, m] = filterDate.split('-').map(Number);
            const selectedDate = new Date(y, m - 1);
            result = result.filter(item => {
                const start = new Date(item.startDate);
                const startMonth = new Date(start.getFullYear(), start.getMonth());
                const monthsDiff = (selectedDate.getFullYear() - startMonth.getFullYear()) * 12 + (selectedDate.getMonth() - startMonth.getMonth());
                return monthsDiff >= 0 && monthsDiff < item.term;
            });
        }
        return result;
    }, [items, filterOwner, filterDate]);

    const activeReferenceDate = useMemo(() => {
        if (filterDate) {
            const [y, m] = filterDate.split('-').map(Number);
            return new Date(y, m - 1, 1);
        }
        return new Date();
    }, [filterDate]);

    const { inProgressItems, completedItems } = useMemo(() => {
        const targetDate = activeReferenceDate;
        const targetMonthStr = getYearMonth(targetDate);
        const inProgress = [];
        const completed = [];
        filteredItems.forEach(item => {
            const isPaid = item.paidMonths?.includes(targetMonthStr);
            const stats = calculateItemStats(item, targetDate);
            if (isPaid || stats.isFinished) {
                completed.push(item);
            } else {
                inProgress.push(item);
            }
        });
        return { inProgressItems: inProgress, completedItems: completed };
    }, [filteredItems, activeReferenceDate]);

    const totalStats = useMemo(() => {
        return filteredItems.reduce((acc, item) => {
            const stats = calculateItemStats(item, activeReferenceDate);
            const currentYM = getYearMonth(activeReferenceDate);
            const isPaid = item.paidMonths?.includes(currentYM);
            if (!stats.isFinished) {
                if (!isPaid) {
                    acc.monthlyTotal += item.monthlyPayment;
                }
                acc.remainingTotal += stats.remainingAmount;
            }
            return acc;
        }, { monthlyTotal: 0, remainingTotal: 0 });
    }, [filteredItems, activeReferenceDate]);

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

    const handleTogglePaid = async (item) => {
        if (!user) return;
        const targetMonthStr = getYearMonth(activeReferenceDate);
        const currentPaidMonths = item.paidMonths || [];
        const isPaid = currentPaidMonths.includes(targetMonthStr);
        let newPaidMonths;
        if (isPaid) {
            newPaidMonths = currentPaidMonths.filter(m => m !== targetMonthStr);
        } else {
            newPaidMonths = [...currentPaidMonths, targetMonthStr].sort();
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

    const renderInstallmentList = (listItems, title, isEmptyMessage, bgClass = "") => (
        <div className={`space-y-4 p-4 rounded-xl ${bgClass}`}>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider pl-1 border-l-4 border-indigo-500 hover:text-indigo-600 transition-colors cursor-default">{title} ({listItems.length})</h3>
            {listItems.length === 0 ? (
                <div className="text-center py-10 bg-white/50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 transition-all group hover:border-indigo-300 dark:hover:border-indigo-700">
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-xs group-hover:text-indigo-500 transition-colors">{isEmptyMessage}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {listItems.map((item) => {
                        const targetMonthStr = getYearMonth(activeReferenceDate);
                        const isPaid = item.paidMonths?.includes(targetMonthStr);
                        return (
                            <InstallmentItem
                                key={item.id}
                                item={item}
                                onEdit={handleOpenEdit}
                                onDelete={confirmDelete}
                                referenceDate={activeReferenceDate}
                                isPaid={isPaid}
                                onTogglePaid={handleTogglePaid}
                                isReadOnly={false}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Tổng dư nợ còn lại</p>
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

            {/* Items Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {renderInstallmentList(inProgressItems, "Đang chờ thanh toán", "Tất cả đã được thanh toán cho tháng này!", "bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700")}
                {renderInstallmentList(completedItems, "Đã hoàn thành", "Chưa có mục nào hoàn thành.", "bg-slate-50/50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700")}
            </div>

            {/* Modals */}
            <AddEditModal
                isOpen={isAddEditModalOpen}
                onClose={() => setIsAddEditModalOpen(false)}
                onSave={handleSaveItem}
                editingItem={editingItem}
                uniqueOwners={payers}
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
