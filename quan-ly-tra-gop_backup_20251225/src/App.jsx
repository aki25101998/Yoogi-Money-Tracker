import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Plus, CreditCard, Calendar, TrendingUp,
    Loader2, LogIn, LogOut, User, Filter, FileJson, Upload,
    Sparkles, Info, X,
    AlertTriangle,
    RotateCcw, // Icon tái tạo (re-analyze)
    ChevronUp, // Icon thu nhỏ (collapse)
    ChevronDown, // Icon mở rộng (expand)
    Moon, Sun, // Icon Dark Mode
    Check // Icon Check
} from 'lucide-react';
import {
    signInWithPopup, signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    collection, addDoc, deleteDoc, updateDoc, doc,
    onSnapshot, query
} from 'firebase/firestore';

// Config & Utils
import { auth, db, googleProvider, APP_ID } from './config/firebase';
import { formatCurrency } from './utils/formatters';
import { calculateLoan, calculateItemStats } from './utils/calculations';

// Components
import Card from './components/ui/Card';
import InstallmentItem from './components/InstallmentItem';
import AddEditModal from './components/modals/AddEditModal';
import ConfirmModal from './components/modals/ConfirmModal';

export default function App() {
    // --- State ---
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Item đang sửa

    // Confirm Modal States
    const [confirmModalState, setConfirmModalState] = useState({
        isOpen: false,
        type: null, // 'delete' | 'import'
        data: null, // ID to delete or Data to import
        title: '',
        description: '',
        confirmVariant: 'primary'
    });

    const [isProcessing, setIsProcessing] = useState(false); // Chung cho loading delete/import

    // AI & UI State
    const [aiAdvice, setAiAdvice] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAdvice, setShowAdvice] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // Filter State
    const [filterOwner, setFilterOwner] = useState('all');
    const [filterDate, setFilterDate] = useState(''); // Định dạng 'YYYY-MM'
    const [hideCompleted, setHideCompleted] = useState(false);

    // File Input Ref
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null);

    // --- Dark Mode State ---
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // --- Auth & Data Effects ---

    // 1. Initialize Auth
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Data
    useEffect(() => {
        setItems([]);
        setIsLoading(true);
        let unsubscribeSnapshot = () => { };

        if (user) {
            const q = query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'installments'));

            unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const fetchedItems = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                fetchedItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                setItems(fetchedItems);
                setIsLoading(false);
            }, (error) => {
                console.error("Firestore Error:", error);
                setIsLoading(false);
            });
        } else {
            setItems([]);
            setIsLoading(false);
        }

        return () => unsubscribeSnapshot();
    }, [user]);

    // --- Derived State ---

    const uniqueOwners = useMemo(() => {
        const owners = new Set(items.map(i => i.owner || 'Tôi'));
        return ['all', ...Array.from(owners)];
    }, [items]);

    const filteredItems = useMemo(() => {
        let result = items;

        // 1. Filter by Owner
        if (filterOwner !== 'all') {
            result = result.filter(item => (item.owner || 'Tôi') === filterOwner);
        }

        // 2. Filter by Date (Month)
        if (filterDate) {
            const [y, m] = filterDate.split('-').map(Number);
            const selectedDate = new Date(y, m - 1); // JS Month is 0-indexed

            result = result.filter(item => {
                const start = new Date(item.startDate);
                // Normalize start date to 1st of month to avoid day discrepancies
                const startMonth = new Date(start.getFullYear(), start.getMonth());

                // Calculate month difference
                const monthsDiff = (selectedDate.getFullYear() - startMonth.getFullYear()) * 12 + (selectedDate.getMonth() - startMonth.getMonth());

                // Item is active if 0 <= diff < term
                return monthsDiff >= 0 && monthsDiff < item.term;
            });
        }

        // 3. Filter "Hide Completed"
        if (hideCompleted) {
            result = result.filter(item => {
                const stats = calculateItemStats(item);
                return !stats.isFinished;
            });
        }

        return result;
    }, [items, filterOwner, filterDate, hideCompleted]);

    // --- Stats Reference Date (Time Travel Logic) ---
    const activeReferenceDate = useMemo(() => {
        if (filterDate) {
            const [y, m] = filterDate.split('-').map(Number);
            return new Date(y, m - 1, 1); // 1st of selected month.
        }
        return new Date();
    }, [filterDate]);

    const totalStats = useMemo(() => {
        return filteredItems.reduce((acc, item) => {
            // Pass activeReferenceDate for projection
            const stats = calculateItemStats(item, activeReferenceDate);

            // Only count currently active (unfinished) items at that point in time
            // However, calculateItemStats.isFinished is true if passed >= term.
            // If viewing history, and item stats says isFinished = false (because date is before end), we show it.
            // Wait, if I travel back to 2023. A loan from 2024 doesn't exist yet (monthsPassed=0).
            // Should we count it? 
            // monthDiff returns 0 if future.

            if (!stats.isFinished) {
                // Check if loan has actually started at this reference date
                // If monthsPassed is 0, logic says 0 paid. Remaining = Full.
                // But does it contribute to "Monthly Total"?
                // If refDate < startDate, effectively monthsDiff is 0.
                // Should we show Monthly Payment?
                // Logic in filteredItems handles "Is Active In Month".
                // So if filteredItems includes it, we should count it.

                acc.monthlyTotal += item.monthlyPayment;
                acc.remainingTotal += stats.remainingAmount;
            }
            return acc;
        }, { monthlyTotal: 0, remainingTotal: 0 });
    }, [filteredItems, activeReferenceDate]);

    // --- Handlers ---

    const handleGoogleLogin = async () => {
        if (!auth) {
            alert("Chế độ Offline: Chưa cấu hình Firebase. Vui lòng cập nhật file .env để đăng nhập.");
            return;
        }
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login Error:", error);
            alert("Đăng nhập thất bại: " + error.message);
        }
    };

    const handleLogout = async () => {
        try { await signOut(auth); } catch (error) { console.error("Logout Error:", error); }
    };

    // Add/Edit Handlers
    const handleOpenAdd = () => {
        setEditingItem(null);
        setIsAddEditModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
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
            term,
            rate,
            startDate: formData.startDate,
            owner: formData.owner || 'Tôi',
            monthlyPayment,
            totalPayable: monthlyPayment * term,
        };

        if (user) {
            try {
                if (editingItem) {
                    const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'installments', editingItem.id);
                    await updateDoc(docRef, { ...itemData, updatedAt: new Date().toISOString() });
                } else {
                    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'installments'), {
                        ...itemData,
                        createdAt: new Date().toISOString()
                    });
                }
            } catch (err) {
                alert("Lỗi kết nối Cloud. Vui lòng thử lại.");
            }
        }

        setIsAddEditModalOpen(false);
        setEditingItem(null);
    };

    // Delete Handlers
    const confirmDelete = (id) => {
        setConfirmModalState({
            isOpen: true,
            type: 'delete',
            data: id,
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
            } catch (err) {
                console.error("Error deleting doc:", err);
            }
        }
        setIsProcessing(false);
        setConfirmModalState({ ...confirmModalState, isOpen: false });
    };

    // Import/Export Handlers
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
                    isOpen: true,
                    type: 'import',
                    data: importedItems,
                    title: 'Xác nhận nạp dữ liệu?',
                    description: `Tìm thấy ${importedItems.length} khoản vay. Sẽ được thêm vào danh sách hiện tại.`,
                    confirmVariant: 'primary',
                    icon: Upload,
                    iconColorClass: "text-indigo-600",
                    iconBgClass: "bg-indigo-100"
                });
            } catch (err) {
                alert("Lỗi file: " + err.message);
            }
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
            const validItems = [];

            // Pre-process items
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

                    const cleanItem = {
                        name,
                        originalAmount: amount,
                        term,
                        rate,
                        startDate,
                        owner,
                        monthlyPayment,
                        totalPayable,
                        createdAt: new Date().toISOString()
                    };
                    validItems.push(cleanItem);
                }
            }

            if (user) {
                // Online: Add to Firestore one by one
                for (const item of validItems) {
                    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'installments'), item);
                    successCount++;
                }
            }

            alert(`Đã nạp thành công ${successCount} khoản vay!`);

        } catch (e) {
            console.error("Import execution failed", e);
            alert("Có lỗi xảy ra khi nạp dữ liệu: " + e.message);
        } finally {
            setIsProcessing(false);
            setConfirmModalState({ ...confirmModalState, isOpen: false });
        }
    };

    const handleConfirmAction = () => {
        if (confirmModalState.type === 'delete') {
            executeDelete();
        } else if (confirmModalState.type === 'import') {
            executeImport();
        }
    };

    // --- AI Analysis ---
    const handleAnalyzeFinances = async () => {
        if (filteredItems.length === 0) return;
        setIsAnalyzing(true);
        setShowAdvice(true);
        setAiAdvice(null);
        try {
            const summaryData = filteredItems.map(item => {
                const stats = calculateItemStats(item);
                return {
                    item: item.name,
                    debt: Math.round(stats.remainingAmount),
                    left: item.term - stats.effectiveMonths,
                };
            }).filter(i => i.left > 0);

            const prompt = `Hãy đóng vai một Chuyên Gia Phân Tích Tài Chính Cấp Cao.
            Dựa trên dữ liệu: ${JSON.stringify(summaryData)}.
            
            Hãy lập BÁO CÁO TÀI CHÍNH NGẮN GỌN (tối đa 300 chữ) theo 3 phần:

            1. TỔNG QUAN DANH MỤC NỢ 📊
            2. KHUYẾN NGHỊ THANH KHOẢN 🎯
            3. GIẢI PHÁP TỐI ƯU DÒNG TIỀN 💡

            QUY TẮC TRÌNH BÀY (BẮT BUỘC TUÂN THỦ):
            ⛔ CẤM TUYỆT ĐỐI dùng Markdown (như dấu thăng ###, dấu sao **, dấu gạch - ).
            ⛔ KHÔNG dùng gạch đầu dòng.
            ✅ Văn phong: Chuyên nghiệp, súc tích, khách quan như báo cáo kinh tế.
            ✅ Chỉ dùng Emoji ở đầu câu để thay thế cho gạch đầu dòng/dấu chấm tròn.`;
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${import.meta.env.VITE_GENERATIVE_AI_KEY || ""}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                }
            );
            const data = await response.json();
            setAiAdvice(data.candidates?.[0]?.content?.parts?.[0]?.text || "Lỗi AI.");
        } catch (error) {
            setAiAdvice("Hệ thống bận.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 pb-20 transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm transition-colors duration-200">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex justify-between items-center mb-3 sm:mb-2">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                                <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Quản Lý Trả Góp</h1>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Login / User Status / Theme Toggle */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors mr-1"
                            >
                                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </button>

                            {user && (
                                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    )}
                                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 max-w-[80px] truncate hidden sm:inline">{user.displayName || user.email}</span>
                                    <button onClick={handleLogout} className="ml-1 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400" title="Đăng xuất">
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls Bar - Only show if logged in */}
                    {user && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="relative group">
                                {/* Custom Dropdown UI */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-700">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="whitespace-nowrap">Người trả:</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[100px]">
                                        {filterOwner === 'all' ? 'Tất cả' : filterOwner}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>

                                {/* Invisible Select Trigger */}
                                <select
                                    value={filterOwner}
                                    onChange={(e) => setFilterOwner(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    title="Chọn người trả"
                                >
                                    {uniqueOwners.map(owner => (
                                        <option
                                            key={owner}
                                            value={owner}
                                            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                        >
                                            {owner === 'all' ? 'Tất cả' : owner}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2 ml-auto items-center">
                                {/* Hide Finished Toggle */}
                                <button
                                    onClick={() => setHideCompleted(!hideCompleted)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border select-none ${hideCompleted
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-none'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${hideCompleted ? 'bg-white text-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                        {hideCompleted && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                                    </div>
                                    <span className="hidden sm:inline">Ẩn đã xong</span>
                                    <span className="sm:hidden">Ẩn xong</span>
                                </button>

                                {/* Date Filter - Custom UI with showPicker trigger */}
                                <div className="relative group">
                                    {/* Visible Custom UI */}
                                    <div
                                        onClick={() => dateInputRef.current?.showPicker()}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer select-none ${filterDate
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}>
                                        <Calendar className={`w-3.5 h-3.5 ${filterDate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                        <span>
                                            {filterDate
                                                ? `Tháng ${filterDate.split('-').reverse().join('/')}`
                                                : 'Chọn tháng'}
                                        </span>
                                        {/* Spacer */}
                                        <div className="w-0"></div>
                                    </div>

                                    {/* Invisible Input Trigger - Positioned absolutely but handled via ref */}
                                    <input
                                        ref={dateInputRef}
                                        type="month"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="absolute start-0 bottom-0 w-0 h-0 opacity-0 -z-10 border-0 p-0 m-0"
                                        title="Chọn tháng"
                                    />

                                    {/* Clear Button */}
                                    {filterDate && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Stop firing parent's showPicker
                                                setFilterDate('');
                                            }}
                                            className="absolute -right-2 -top-2 z-20 bg-white dark:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-full p-0.5 shadow-sm border border-slate-200 dark:border-slate-600 hover:scale-110 transition-transform"
                                            title="Xóa lọc tháng"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                                <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportJSON} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium transition-colors"
                                    title="Nạp dữ liệu từ file JSON backup"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">Nạp (Import)</span>
                                </button>

                                <button
                                    onClick={handleExportJSON}
                                    className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium transition-colors"
                                    title="Tải về file backup JSON"
                                >
                                    <FileJson className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">Sao lưu</span>
                                </button>

                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                                <button
                                    onClick={handleOpenAdd}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm shadow-indigo-200 dark:shadow-none"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Thêm mới
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {!user ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center p-6 transition-colors">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full mb-6 relative">
                            <CreditCard className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Chào mừng trở lại!</h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8">
                            Đăng nhập để quản lý các khoản trả góp của bạn, phân tích tài chính với AI và đồng bộ dữ liệu trên mọi thiết bị.
                        </p>

                        <div className="space-y-3 w-full max-w-xs">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-0.5"
                            >
                                <LogIn className="w-5 h-5" />
                                Đăng nhập với Google
                            </button>
                            {/* Warning if no auth detected */}
                            {!auth && (
                                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                    ⚠️ Lỗi cấu hình Firebase. Vui lòng kiểm tra file .env
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Dashboard Content - Only rendered if logged in */
                    <>
                        {/* Loading State */}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-500" />
                                <p>Đang tải dữ liệu từ Cloud...</p>
                            </div>
                        ) : (
                            <>
                                {/* Context Title */}
                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <User className="w-4 h-4" />
                                    <span>
                                        Thống kê: <span className="font-bold text-slate-700 dark:text-slate-200">{filterOwner === 'all' ? 'Toàn nhóm' : filterOwner}</span>
                                    </span>
                                    {filterDate && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-600">|</span>
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                Tháng: <span className="font-bold text-indigo-600 dark:text-indigo-400">{filterDate.split('-').reverse().join('/')}</span>
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Card className="p-5 bg-gradient-to-br from-indigo-600 to-violet-600 border-none text-white relative overflow-hidden shadow-lg">
                                        <div className="relative z-10 flex items-start justify-between">
                                            <div>
                                                <p className="text-indigo-100 text-xs uppercase tracking-wider font-bold mb-1 opacity-90">Phải trả tháng này</p>
                                                <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(totalStats.monthlyTotal)}</h2>
                                            </div>
                                            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                                                <Calendar className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-5 relative overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 transition-colors">
                                        <div className="flex items-start justify-between relative z-10">
                                            <div>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Tổng dư nợ còn lại</p>
                                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalStats.remainingTotal)}</h2>
                                            </div>
                                            <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl">
                                                <TrendingUp className="w-6 h-6 text-slate-500 dark:text-slate-300" />
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {/* AI Analysis Section */}
                                {filteredItems.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 overflow-hidden transition-colors">
                                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">AI Phân Tích</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                {showAdvice ? (
                                                    <>
                                                        <button
                                                            onClick={handleAnalyzeFinances}
                                                            disabled={isAnalyzing}
                                                            className="text-xs bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 font-medium flex items-center gap-1 shadow-sm disabled:opacity-50"
                                                            title="Phân tích lại"
                                                        >
                                                            <RotateCcw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                                            <span className="hidden sm:inline">Phân tích lại</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setShowAdvice(false)}
                                                            className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 font-medium flex items-center gap-1 shadow-sm"
                                                            title="Thu gọn"
                                                        >
                                                            <ChevronUp className="w-3 h-3" />
                                                            <span className="hidden sm:inline">Thu gọn</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    aiAdvice ? (
                                                        <button
                                                            onClick={() => setShowAdvice(true)}
                                                            className="text-xs bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 font-medium flex items-center gap-1 shadow-sm"
                                                        >
                                                            <ChevronDown className="w-3 h-3" />
                                                            Xem lại phân tích
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={handleAnalyzeFinances}
                                                            className="text-xs bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-600 font-medium flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Sparkles className="w-3 h-3" />
                                                            Phân tích ngay
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        {showAdvice && (
                                            <div className="p-5 bg-gradient-to-b from-white to-indigo-50/20 dark:from-slate-800 dark:to-slate-900">
                                                {isAnalyzing ? (
                                                    <div className="flex items-center justify-center py-2 text-slate-500 dark:text-slate-400 gap-2 text-sm">
                                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang suy nghĩ...
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{aiAdvice}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* List Items */}
                                <div className="space-y-4">
                                    {filteredItems.length === 0 ? (
                                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors">
                                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Chưa có dữ liệu.</p>
                                            <button onClick={handleOpenAdd} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-2">+ Thêm mới</button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {filteredItems.map((item) => (
                                                <InstallmentItem
                                                    key={item.id}
                                                    item={item}
                                                    onEdit={handleOpenEdit}
                                                    onDelete={confirmDelete}
                                                    referenceDate={activeReferenceDate}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </main>

            {/* Models */}
            <AddEditModal
                isOpen={isAddEditModalOpen}
                onClose={() => setIsAddEditModalOpen(false)}
                onSave={handleSaveItem}
                editingItem={editingItem}
                uniqueOwners={uniqueOwners}
            />

            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ ...confirmModalState, isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmModalState.title}
                description={confirmModalState.description}
                icon={confirmModalState.icon}
                iconColorClass={confirmModalState.iconColorClass || "text-indigo-600"}
                iconBgClass={confirmModalState.iconBgClass || "bg-indigo-100"}
                confirmVariant={confirmModalState.confirmVariant}
                isLoading={isProcessing}
            />
        </div >
    );
}
