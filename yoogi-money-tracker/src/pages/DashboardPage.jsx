import React, { useState, useMemo, useEffect } from 'react';
import {
    Wallet, ArrowUpRight, ArrowDownRight, CreditCard,
    PieChart as PieChartIcon, Sparkles, Loader2, Plus, Pencil,
    Filter, Calendar, ChevronDown, Check, Info, Trash2, AlertTriangle, Clock,
    RotateCcw, ChevronUp, TrendingUp, TrendingDown, Target, ShieldCheck, AlertCircle, Lightbulb
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { categorizeTransaction } from '../utils/aiCategorizer';
import { addTransaction, incrementMemoryUsage, updateWalletOrder, addWallet, updateWallet, updateTransaction, processCorrections, deleteTransaction } from '../utils/supabaseHelpers';
import { supabase } from '../config/supabase';
import TransactionModal from '../components/modals/TransactionModal';
import WalletModal from '../components/modals/WalletModal';
import UpgradeProModal from '../components/modals/UpgradeProModal';
import ReorderWalletsModal from '../components/modals/ReorderWalletsModal';
import TransferFundsModal from '../components/modals/TransferFundsModal';
import DateRangeSelector from '../components/DateRangeSelector';
import AIContextModal from '../components/modals/AIContextModal';
import CategoryTransactionsModal from '../components/modals/CategoryTransactionsModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { Bot, PenSquare } from 'lucide-react';

import {
    DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

const SortableWalletCard = ({ w, isSelected, onClick, onClickEdit, onLongPress }) => {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: w.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const [startLongPress, setStartLongPress] = useState(false);
    useEffect(() => {
        let timerId;
        if (startLongPress) {
            timerId = setTimeout(() => {
                setStartLongPress(false);
                if (onLongPress) onLongPress();
            }, 500);
        } else {
            clearTimeout(timerId);
        }
        return () => clearTimeout(timerId);
    }, [startLongPress, onLongPress]);

    const longPressProps = {
        onTouchStart: () => setStartLongPress(true),
        onTouchEnd: () => setStartLongPress(false),
        onTouchMove: () => setStartLongPress(false),
        onTouchCancel: () => setStartLongPress(false),
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            {...attributes} 
            {...listeners}
            {...longPressProps}
            className={`min-w-[140px] flex-shrink-0 rounded-2xl p-4 border cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'scale-105 shadow-xl border-emerald-500' : isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-300'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{w.icon}</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); onClickEdit(w); }}
                    className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Sửa ví"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate mb-1">{w.name}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(w.balance)}</p>
        </div>
    );
};

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8'];

const DashboardPage = ({ user, userSettings, transactions, categories, aiMemories, wallets, recurringTransactions, payers, onNavigate }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // --- State ---
    const [selectedWalletIds, setSelectedWalletIds] = useState(() => {
        try {
            const saved = localStorage.getItem('yoogi_selected_wallet_ids');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('yoogi_selected_wallet_ids', JSON.stringify(selectedWalletIds));
    }, [selectedWalletIds]);
    
    // Validate selectedWalletIds against loaded wallets to remove old Firebase IDs
    useEffect(() => {
        if (wallets && wallets.length > 0 && selectedWalletIds.length > 0) {
            const validIds = selectedWalletIds.filter(id => wallets.some(w => w.id === id));
            if (validIds.length !== selectedWalletIds.length) {
                setSelectedWalletIds(validIds);
            }
        }
    }, [wallets, selectedWalletIds]);
    // UI States
    const [localWallets, setLocalWallets] = useState([]);
    useEffect(() => {
        setLocalWallets(wallets || []);
    }, [wallets]);
    
    const [isAIContextOpen, setIsAIContextOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState({ start: null, end: null, mode: 'month', label: '' });

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const [walletModalMode, setWalletModalMode] = useState('add');
    const [editingWallet, setEditingWallet] = useState(null);

    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    const [chartType, setChartType] = useState('expense'); // 'expense' or 'income'
    const [activeSegment, setActiveSegment] = useState(null);
    const [selectedCategoryForModal, setSelectedCategoryForModal] = useState(null);

    // AI Financial Analysis states
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [showAiAnalysis, setShowAiAnalysis] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.recharts-wrapper')) {
                setActiveSegment(null);
            }
        };
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = localWallets.findIndex(w => w.id === active.id);
            const newIndex = localWallets.findIndex(w => w.id === over.id);
            const newWallets = arrayMove(localWallets, oldIndex, newIndex);
            
            // Eagerly update local state for smooth UX
            setLocalWallets(newWallets);
            
            try {
                await updateWalletOrder(user.uid, newWallets.map(w => w.id));
            } catch (error) {
                console.error(error);
                // Revert on error
                setLocalWallets(wallets || []);
            }
        }
    };

    const handleSaveWallet = async (formData) => {
        if (!user) return;
        try {
            if (walletModalMode === 'edit' && editingWallet) {
                
                await updateWallet(user.uid, editingWallet.id, {
                    name: formData.name,
                    icon: formData.icon,
                    initialBalance: formData.initialBalance,
                });
            } else {
                await addWallet(user.uid, {
                    name: formData.name,
                    icon: formData.icon,
                    initialBalance: formData.initialBalance,
                    isDefault: false,
                    order: walletBalances.length,
                });
            }
            setIsWalletModalOpen(false);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    // --- Calculations ---
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

    // --- Handlers ---

    const handleSaveTransaction = async (formData) => {
        if (!user) return;
        try {
            if (editingTransaction) {
                
                await processCorrections(user.uid, editingTransaction, formData);
                await updateTransaction(user.uid, editingTransaction.id, formData);
            } else {
                await addTransaction(user.uid, { ...formData, aiCategorized: false });
            }
            setIsModalOpen(false);
            setIsTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (!user) return;
        try {
            
            await deleteTransaction(user.uid, transactionId);
            setIsModalOpen(false);
            setIsTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi khi xóa: ' + err.message);
        }
    };

    const handleQuickDelete = async () => {
        if (!user || !deleteModal.id) return;
        setIsDeleting(true);
        try {
            
            await deleteTransaction(user.uid, deleteModal.id);
            setDeleteModal({ isOpen: false, id: null });
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
        setIsDeleting(false);
    };

    const openDeleteModal = (e, id) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, id });
    };

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

    // --- AI Financial Analysis (50/30/20 Rule) ---
    const handleAiAnalyzeFinances = async () => {
        if (filteredTransactions.length === 0) return;
        setIsAiAnalyzing(true);
        setShowAiAnalysis(true);
        setAiAnalysisResult(null);
        try {
            // Build spending breakdown by category
            const expenseTxns = filteredTransactions.filter(t => t.type === 'expense');
            const incomeTxns = filteredTransactions.filter(t => t.type === 'income');
            const totalExpense = expenseTxns.reduce((s, t) => s + (t.amount || 0), 0);
            const totalIncome = incomeTxns.reduce((s, t) => s + (t.amount || 0), 0);

            // Group expenses by category
            const categoryBreakdown = {};
            expenseTxns.forEach(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const catName = cat ? cat.name : 'Chưa phân loại';
                categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + (t.amount || 0);
            });

            const categoryList = Object.entries(categoryBreakdown)
                .map(([name, amount]) => ({ name, amount: Math.round(amount), percent: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0 }))
                .sort((a, b) => b.amount - a.amount);

            const dateLabel = dateRange.label || 'kỳ hiện tại';

            const prompt = `Bạn là Chuyên Gia Phân Tích Tài Chính Cá Nhân Cấp Cao, chuyên về Chiến Lược Quản Lý Tài Chính 50/30/20.

QUY TẮC 50/30/20:
- 50% thu nhập cho NHU CẦU THIẾT YẾU (nhà ở, ăn uống, đi lại, hóa đơn, bảo hiểm)
- 30% thu nhập cho MONG MUỐN (giải trí, mua sắm, du lịch, cafe, ăn ngoài)
- 20% thu nhập cho TIẾT KIỆM & ĐẦU TƯ (tiết kiệm, trả nợ, đầu tư)

DỮ LIỆU TÀI CHÍNH CỦA NGƯỜI DÙNG (${dateLabel}):
- Tổng thu nhập: ${totalIncome.toLocaleString('vi-VN')}đ
- Tổng chi tiêu: ${totalExpense.toLocaleString('vi-VN')}đ
- Tổng số dư hiện tại: ${totalBalance.toLocaleString('vi-VN')}đ
- Chi tiết chi tiêu theo danh mục:
${categoryList.map(c => `  • ${c.name}: ${c.amount.toLocaleString('vi-VN')}đ (${c.percent}%)`).join('\n')}

Hãy phân tích TOÀN DIỆN theo 3 phần sau:

1. ƯU ĐIỂM HIỆN TẠI ✅
Dựa trên dữ liệu, chỉ ra những điểm tích cực trong cách quản lý tài chính (ít nhất 2-3 điểm).

2. KHUYẾT ĐIỂM HIỆN TẠI ⚠️
Chỉ ra các vấn đề, rủi ro tài chính dựa theo quy tắc 50/30/20 (ít nhất 2-3 điểm).

3. LỜI KHUYÊN TÀI CHÍNH 💡
Đưa ra lời khuyên cụ thể, thực tế để cải thiện tình hình tài chính (ít nhất 2-3 lời khuyên, có con số cụ thể nếu có thể).

QUY TẮC TRÌNH BÀY (BẮT BUỘC):
⛔ CẤM TUYỆT ĐỐI dùng Markdown (không dấu **, không ###, không gạch đầu dòng -).
✅ Mỗi phần bắt đầu bằng tiêu đề có emoji.
✅ Các điểm phân tích dùng emoji số (1️⃣ 2️⃣ 3️⃣) ở đầu.
✅ Văn phong: Chuyên nghiệp, súc tích, thân thiện.
✅ Sử dụng số tiền VNĐ cụ thể khi phân tích.
✅ Giữa các phần cách nhau bằng 1 dòng trống.
✅ Tối đa 400 chữ.`;

            
            const { data, error } = await supabase.functions.invoke('gemini-ai', {
                body: {
                    action: 'analyze_finances',
                    payload: { contents: [{ parts: [{ text: prompt }] }] }
                }
            });
            if (error) throw error;
            setAiAnalysisResult(data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể phân tích lúc này.");
        } catch (error) {
            console.error('AI Analysis error:', error);
            setAiAnalysisResult("Hệ thống đang bận, vui lòng thử lại sau.");
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 relative min-h-screen">
            {/* 1. Dashboard Header - (Old AI Bar removed) */}

            {/* 2. Total Balance & Wallets */}
            <div className="relative bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-slate-950 dark:to-slate-900 rounded-[32px] p-8 mb-6 shadow-[0_8px_30px_rgb(16,185,129,0.3)] dark:shadow-2xl border border-emerald-300/50 dark:border-slate-800 overflow-hidden mt-2">
                {/* Glassmorphism shine overlay */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 dark:from-white/10 to-transparent opacity-60 dark:opacity-30 pointer-events-none"></div>
                
                {/* Decorative glowing orbs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 dark:bg-emerald-500/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-800/20 dark:bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/50 mb-3 backdrop-blur-md shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-white dark:text-emerald-400" />
                        <span className="text-xs font-bold text-white dark:text-slate-300 uppercase tracking-widest">Tổng số dư</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md pb-1">
                        {formatCurrency(totalBalance)}
                    </h1>
                </div>
            </div>

            <div className="px-1 mb-2 flex items-center">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input 
                        type="radio" 
                        name="selectAllWallets"
                        checked={selectedWalletIds.length === 0} 
                        onChange={() => setSelectedWalletIds([])}
                        className="w-4 h-4 text-emerald-500 border-slate-300 focus:ring-emerald-500"
                    />
                    Tất cả ví
                </label>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 pt-2 px-1 no-scrollbar">

                {/* Các ví cụ thể */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
                    <SortableContext items={walletBalances.map(w => w.id)} strategy={horizontalListSortingStrategy}>
                        {walletBalances.map((w, i) => {
                            const isSelected = selectedWalletIds.length === 0 || selectedWalletIds.includes(w.id);
                            return (
                                <SortableWalletCard 
                                    key={w.id} 
                                    w={w} 
                                    isSelected={isSelected} 
                                    onClick={() => {
                                        if (selectedWalletIds.includes(w.id)) {
                                            setSelectedWalletIds(selectedWalletIds.filter(id => id !== w.id));
                                        } else {
                                            setSelectedWalletIds([...selectedWalletIds, w.id]);
                                        }
                                    }} 
                                    onClickEdit={(wData) => {
                                        setWalletModalMode('edit');
                                        setEditingWallet(wData);
                                        setIsWalletModalOpen(true);
                                    }}
                                    onLongPress={() => setIsReorderModalOpen(true)}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>

                {/* Thêm ví mới */}
                <div 
                    onClick={() => {
                        if (!userSettings?.isPro && wallets?.length >= 2) {
                            setIsUpgradeModalOpen(true);
                        } else {
                            setWalletModalMode('add');
                            setEditingWallet(null);
                            setIsWalletModalOpen(true);
                        }
                    }}
                    className="min-w-[140px] flex-shrink-0 rounded-2xl p-4 border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                    <Plus className="w-8 h-8 mb-2" />
                    <p className="text-sm font-bold">Thêm ví</p>
                </div>
            </div>

            {/* 3. Time Filter & Net Change Card */}
            <div>
                <div className="mb-4">
                    <DateRangeSelector 
                        initialMode="month" 
                        onChange={(range) => setDateRange(range)} 
                        userSettings={userSettings}
                    />
                </div>

                {/* Net Change Card - Themed like the image */}
                <div className="bg-gradient-to-br from-cyan-100 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/20 rounded-[28px] p-6 shadow-sm border border-white/50 dark:border-cyan-800/30">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-slate-600 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                                Thay đổi ròng <Info className="w-4 h-4 text-slate-400" />
                            </p>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {formatCurrency(summaryStats.balance)}
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center sm:block sm:text-center">
                            <p className="text-rose-500 text-sm font-black uppercase tracking-wider sm:mb-1 drop-shadow-sm">Chi phí</p>
                            <p className="text-rose-600 dark:text-rose-400 text-lg font-black flex items-center justify-center gap-1">
                                <ArrowDownRight className="w-5 h-5" />
                                {formatCurrency(summaryStats.expense)}
                            </p>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center sm:block sm:text-center">
                            <p className="text-emerald-500 text-sm font-black uppercase tracking-wider sm:mb-1 drop-shadow-sm">Thu nhập</p>
                            <p className="text-emerald-600 dark:text-emerald-400 text-lg font-black flex items-center justify-center gap-1">
                                <ArrowUpRight className="w-5 h-5" />
                                {formatCurrency(summaryStats.income)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Financial Analysis Section (50/30/20 Rule) */}
            <div className="bg-white dark:bg-slate-800 rounded-[28px] border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm overflow-hidden transition-all">
                <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-cyan-50/30 dark:from-emerald-900/20 dark:via-teal-900/15 dark:to-cyan-900/10 border-b border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
                            <Sparkles className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">AI Phân Tích Tài Chính</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Chiến lược 50/30/20</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {showAiAnalysis ? (
                            <>
                                <button 
                                    onClick={handleAiAnalyzeFinances} 
                                    disabled={isAiAnalyzing || filteredTransactions.length === 0} 
                                    className="text-xs bg-white dark:bg-slate-700 border border-emerald-200 dark:border-slate-600 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-600 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all active:scale-95"
                                >
                                    <RotateCcw className={`w-3 h-3 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">Phân tích lại</span>
                                </button>
                                <button 
                                    onClick={() => setShowAiAnalysis(false)} 
                                    className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                                >
                                    <ChevronUp className="w-3 h-3" />
                                    <span className="hidden sm:inline">Thu gọn</span>
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={handleAiAnalyzeFinances} 
                                disabled={filteredTransactions.length === 0}
                                className="text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-200 dark:shadow-none disabled:opacity-50 transition-all active:scale-95"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Phân tích ngay
                            </button>
                        )}
                    </div>
                </div>
                {showAiAnalysis && (
                    <div className="p-5 bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-800 dark:to-slate-900">
                        {isAiAnalyzing ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">AI đang phân tích...</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Đang đánh giá chi tiêu theo quy tắc 50/30/20</p>
                                </div>
                            </div>
                        ) : aiAnalysisResult ? (
                            <div className="space-y-4">
                                {/* Quick Stats Bar */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800/30">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Nhu cầu</p>
                                        <p className="text-sm font-black text-blue-700 dark:text-blue-300">50%</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-800/30">
                                        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-0.5">Mong muốn</p>
                                        <p className="text-sm font-black text-purple-700 dark:text-purple-300">30%</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800/30">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Tiết kiệm</p>
                                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">20%</p>
                                    </div>
                                </div>
                                {/* AI Response */}
                                <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                                    {aiAnalysisResult}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* 4. Chart Toggle & Donut Chart */}
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

            {/* 6. Recent Transactions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Giao dịch gần đây</h3>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {recentTransactions.length === 0 ? (
                        <div className="px-5 py-8 text-center text-slate-400 text-sm">
                            Chưa có giao dịch.
                        </div>
                    ) : (
                        recentTransactions.map(txn => {
                            const cat = categories.find(c => c.id === txn.categoryId);
                            const wallet = wallets?.find(w => w.id === txn.walletId);
                            const isIncome = txn.type === 'income' || txn.type === 'loan_repaid';
                            const isExpense = txn.type === 'expense' || txn.type === 'loan_given';
                            const isLoan = txn.type === 'loan_given' || txn.type === 'loan_repaid';
                            
                            return (
                                <div key={txn.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group" onClick={() => { 
                                    setEditingTransaction(txn); 
                                    if (txn.type === 'transfer') setIsTransferModalOpen(true);
                                    else setIsModalOpen(true); 
                                }}>
                                    <div className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center text-2xl shadow-inner ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30' : (isExpense ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-slate-100 dark:bg-slate-800')}`}>
                                        {cat?.icon || (isLoan ? (txn.type === 'loan_given' ? '📤' : '📥') : (txn.type === 'transfer' ? '💸' : '❓'))}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate mb-0.5">
                                            {txn.type === 'transfer' ? `${wallets?.find(w => w.id === txn.walletId)?.name || '?'} ➝ ${wallets?.find(w => w.id === txn.transferTo)?.name || '?'}` 
                                            : (txn.type === 'loan_given' ? `Cho mượn ( Ví: ${wallet?.name || '?'} )` 
                                            : (txn.type === 'loan_repaid' ? `Nhận trả nợ ( Ví: ${wallet?.name || '?'} )`
                                            : `${wallet?.name || 'Chưa phân ví'} • ${cat?.name || '❓ Chưa phân loại'} ${txn.subcategoryId && cat?.subcategories?.find(s => s.id === txn.subcategoryId) ? `> ${cat.subcategories.find(s => s.id === txn.subcategoryId).name}` : ''}`))}
                                        </p>
                                        <div className="flex flex-col gap-1 mt-0.5">
                                            {(txn.time || txn.createdAt) && (
                                                <div className="flex items-center">
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                        <Clock className="w-3 h-3" />
                                                        {txn.time || new Date(txn.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                            {(txn.description || txn.note) && (
                                                <p className="font-medium text-slate-500 dark:text-slate-400 text-xs line-clamp-1">
                                                    {isLoan && (txn.description || txn.note) ? (txn.description || txn.note).replace(/^(?:Cho )?.*?(?:mượn|trả nợ):\s*/, '') : (txn.description || txn.note)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className={`font-bold text-sm whitespace-nowrap flex items-center justify-end gap-1 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : (isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}`}>
                                                <span className="flex-shrink-0 w-4 flex items-center justify-center">
                                                    {isIncome ? <ArrowUpRight className="w-4 h-4" /> : (isExpense ? <ArrowDownRight className="w-4 h-4" /> : '⇄')}
                                                </span>
                                                <span className="tabular-nums">{formatCurrency(txn.amount)}</span>
                                            </p>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); openDeleteModal(e, txn.id); }} 
                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modals */}
            <AIContextModal
                isOpen={isAIContextOpen}
                onClose={() => setIsAIContextOpen(false)}
                user={user}
                categories={categories}
                aiMemories={aiMemories}
            />

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                onDelete={handleDeleteTransaction}
                categories={categories}
                wallets={wallets}
                initialData={editingTransaction}
                defaultWalletId={selectedWalletIds.length === 1 ? selectedWalletIds[0] : null}
            />

            <TransferFundsModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                wallets={wallets}
                onSave={handleSaveTransaction}
                onDelete={handleDeleteTransaction}
                initialData={editingTransaction}
            />

            <WalletModal
                isOpen={isWalletModalOpen}
                onClose={() => setIsWalletModalOpen(false)}
                mode={walletModalMode}
                initialData={walletModalMode === 'edit' ? editingWallet : null}
                onSave={handleSaveWallet}
            />

            <UpgradeProModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                user={user}
            />

            <ReorderWalletsModal
                isOpen={isReorderModalOpen}
                onClose={() => setIsReorderModalOpen(false)}
                wallets={walletBalances}
                onSave={async (newOrderIds) => {
                    try {
                        await updateWalletOrder(user.uid, newOrderIds);
                        setIsReorderModalOpen(false);
                    } catch (e) {
                        alert("Lỗi: " + e.message);
                    }
                }}
            />

            <CategoryTransactionsModal
                isOpen={!!selectedCategoryForModal}
                onClose={() => setSelectedCategoryForModal(null)}
                category={selectedCategoryForModal}
                transactions={categoryTransactions}
                categories={categories}
                onEditTransaction={(txn) => {
                    setSelectedCategoryForModal(null);
                    setEditingTransaction(txn);
                    setIsModalOpen(true);
                }}
                onDeleteTransaction={(txnId) => {
                    openDeleteModal({ stopPropagation: () => {} }, txnId);
                }}
            />

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={handleQuickDelete}
                title="Xóa giao dịch này?"
                description="Hành động này không thể hoàn tác."
                confirmText="Xóa"
                confirmVariant="danger"
                isProcessing={isDeleting}
                Icon={AlertTriangle}
                iconColorClass="text-rose-600"
                iconBgClass="bg-rose-100"
            />
        </div>
    );
};

export default DashboardPage;
