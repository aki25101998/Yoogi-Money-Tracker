import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Pencil, Trash2, CheckCircle2, ChevronRight, ChevronDown, Settings, CalendarClock, ArrowRightLeft } from 'lucide-react';
import { categorizeTransaction } from '../../utils/aiCategorizer';
import { addTransaction, incrementMemoryUsage, learnFromCorrection, updateTransaction, deleteTransaction, addDebt, updateDebt } from '../../utils/firebaseHelpers';
import { formatCurrency } from '../../utils/formatters';
import { APP_ID, db } from '../../config/firebase';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import TransferFundsModal from '../modals/TransferFundsModal';
import TransactionModal from '../modals/TransactionModal';
import RecurringTransactionsModal from '../modals/RecurringTransactionsModal';

const AIChatModal = ({ isOpen, onClose, user, categories, aiMemories, wallets, payers, debtors, recurringTransactions, selectedWalletId, onOpenContextWallet }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeWallet, setActiveWallet] = useState(null);
    const messagesEndRef = useRef(null);
    
    const [isContextWalletOpen, setIsContextWalletOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

    // Edit Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditTransferModalOpen, setIsEditTransferModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // Initialize active wallet
    useEffect(() => {
        if (!isOpen) return;
        if (selectedWalletId) {
            setActiveWallet(wallets.find(w => w.id === selectedWalletId));
        } else if (!activeWallet) {
            setActiveWallet(wallets.find(w => w.isDefault) || wallets[0]);
        }
    }, [isOpen, wallets, selectedWalletId]);

    // Load chat history when active wallet changes
    useEffect(() => {
        if (!isOpen || !activeWallet || !user) return;
        
        const historyKey = `ai_chat_history_${user.uid}_${activeWallet.id}`;
        const savedHistory = localStorage.getItem(historyKey);
        
        const welcomeMessage = { id: 'welcome', type: 'bot', text: 'Xin chào! 👋 Hãy bắt đầu thêm giao dịch của bạn tại đây nhé!', timestamp: Date.now() };

        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                
                // Fix bad transaction IDs from previous bug
                parsed.forEach(m => {
                    if (m.transaction && m.transaction.id && typeof m.transaction.id === 'object') {
                        const obj = m.transaction.id;
                        if (obj.id) {
                            m.transaction.id = obj.id;
                        } else if (obj._key?.path?.segments) {
                            const segs = obj._key.path.segments;
                            m.transaction.id = segs[segs.length - 1];
                        } else {
                            m.transaction.id = null;
                        }
                    }
                });

                // Filter messages younger than 48h
                const now = Date.now();
                const filtered = parsed.filter(m => (now - m.timestamp) < 48 * 60 * 60 * 1000);
                
                const userMessages = filtered.filter(m => m.type === 'user');
                if (userMessages.length > 0) {
                    setMessages(filtered);
                } else {
                    setMessages([welcomeMessage]);
                }
            } catch (e) {
                setMessages([welcomeMessage]);
            }
        } else {
            setMessages([welcomeMessage]);
        }
    }, [isOpen, activeWallet, user]);

    // Save history when messages change
    useEffect(() => {
        if (messages.length > 0 && user && activeWallet) {
            const historyKey = `ai_chat_history_${user.uid}_${activeWallet.id}`;
            localStorage.setItem(historyKey, JSON.stringify(messages));
        }
        scrollToBottom();
    }, [messages, user, activeWallet]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleClearChat = () => {
        if (!window.confirm('Xóa toàn bộ lịch sử chat? Hành động này không thể hoàn tác.')) return;
        if (user && activeWallet) {
            const historyKey = `ai_chat_history_${user.uid}_${activeWallet.id}`;
            localStorage.removeItem(historyKey);
        }
        setMessages([{ id: 'welcome', type: 'bot', text: 'Xin chào! 👋 Hãy bắt đầu thêm giao dịch của bạn tại đây nhé!', timestamp: Date.now() }]);
    };

    const handleTransferSave = async (transferData) => {
        try {
            const transferTxn = {
                type: 'transfer',
                amount: transferData.amount,
                description: transferData.description || 'Chuyển tiền',
                categoryId: 'transfer',
                subcategoryId: '',
                date: transferData.date,
                walletId: transferData.walletId,
                transferTo: transferData.transferTo,
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, `artifacts/${APP_ID}/users/${user.uid}/transactions`), transferTxn);

            const aiMsg = {
                id: Date.now().toString(),
                type: 'bot',
                text: `Đã ghi nhận lệnh chuyển ${formatCurrency(transferData.amount)} từ ví này sang ví khác.`,
                transaction: { ...transferTxn, id: docRef.id, originalInput: transferData.description || 'Chuyển tiền' },
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
            
        } catch (error) {
            console.error("Error saving transfer:", error);
        }
    };

    const handleSaveEdit = async (formData) => {
        if (!user || !editingTransaction) return;
        try {
            await updateTransaction(user.uid, editingTransaction.id, formData);
            setMessages(prev => prev.map(msg => {
                if (msg.transaction && msg.transaction.id === editingTransaction.id) {
                    return { ...msg, transaction: { ...msg.transaction, ...formData } };
                }
                return msg;
            }));
            setIsEditModalOpen(false);
            setIsEditTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleDeleteEditWithoutPrompt = async (id) => {
        if (!user || !id) return;
        try {
            await deleteTransaction(user.uid, id);
            setMessages(prev => prev.filter(msg => !(msg.transaction && msg.transaction.id === id)));
            setIsEditModalOpen(false);
            setIsEditTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
        }
    };

    const handleDeleteEdit = async (id) => {
        if (!user || !id) return;
        if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
            await handleDeleteEditWithoutPrompt(id);
        }
    };

    const openEditModal = (txn) => {
        setEditingTransaction(txn);
        if (txn.type === 'transfer') {
            setIsEditTransferModalOpen(true);
        } else {
            setIsEditModalOpen(true);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !user || !activeWallet) return;

        const userMsgText = input.trim();
        const userMsg = { id: Date.now().toString(), type: 'user', text: userMsgText, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const result = await categorizeTransaction(userMsgText, categories, aiMemories, wallets, payers, debtors);
            
            let docRef;
            let finalWalletId = result.walletId || activeWallet.id;
            let transactionData;

            if (result.type === 'loan_given' || result.type === 'loan_repaid') {
                const amountNum = parseFloat(result.amount) || 0;
                let debtId = null;
                const personName = result.personName || 'Người vô danh';

                if (result.type === 'loan_given') {
                    const debtData = {
                        personName: personName,
                        totalAmount: amountNum,
                        repaidAmount: 0,
                        status: 'active',
                        notes: result.debtNotes || '',
                        date: new Date().toISOString()
                    };
                    const debtRef = await addDebt(user.uid, debtData);
                    debtId = debtRef.id;
                } else if (result.type === 'loan_repaid') {
                    // Cố gắng tìm khoản nợ đang active của người này
                    const debtsRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'debts');
                    const q = query(debtsRef, where('personName', '==', personName), where('status', '==', 'active'), limit(1));
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        const debtDoc = querySnapshot.docs[0];
                        const debtData = debtDoc.data();
                        debtId = debtDoc.id;
                        
                        const newRepaidAmount = (debtData.repaidAmount || 0) + amountNum;
                        const newStatus = newRepaidAmount >= debtData.totalAmount ? 'completed' : 'active';
                        
                        await updateDebt(user.uid, debtId, {
                            repaidAmount: newRepaidAmount,
                            status: newStatus
                        });
                    }
                }

                transactionData = {
                    type: result.type,
                    amount: amountNum,
                    description: result.type === 'loan_given' 
                        ? `Cho ${personName} mượn${result.debtNotes ? ': ' + result.debtNotes : ''}` 
                        : `${personName} trả nợ${result.debtNotes ? ': ' + result.debtNotes : ''}`,
                    categoryId: result.type,
                    subcategoryId: '',
                    date: result.date || new Date().toISOString(),
                    walletId: finalWalletId,
                    debtId: debtId,
                    aiCategorized: result.aiCategorized
                };
                docRef = await addTransaction(user.uid, transactionData);

            } else if (result.type === 'transfer') {
                transactionData = {
                    type: 'transfer',
                    amount: result.amount,
                    description: result.description || 'Chuyển tiền',
                    categoryId: 'transfer',
                    subcategoryId: '',
                    date: result.date || new Date().toISOString(),
                    walletId: finalWalletId,
                    transferTo: result.transferTo,
                    aiCategorized: result.aiCategorized
                };
                docRef = await addTransaction(user.uid, transactionData);
            } else {
                transactionData = {
                    type: result.type,
                    amount: result.amount,
                    description: result.description,
                    categoryId: result.categoryId,
                    subcategoryId: result.subcategoryId,
                    date: result.date || new Date().toISOString(),
                    walletId: finalWalletId,
                    aiCategorized: result.aiCategorized,
                };
                docRef = await addTransaction(user.uid, transactionData);
            }

            if (result.memoryId) {
                await incrementMemoryUsage(user.uid, result.memoryId);
            }

            const botMsg = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                text: 'Tuyệt vời! Đã ghi nhận giao dịch của bạn.',
                transaction: { ...transactionData, id: docRef.id, originalInput: userMsgText },
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                text: `❌ Lỗi: ${error.message}`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCategoryChange = async (msgId, transactionId, newCategoryId, originalInput) => {
        if (!user) return;
        if (!transactionId || typeof transactionId !== 'string') {
            alert('Không thể cập nhật giao dịch này do dữ liệu cũ bị lỗi. Vui lòng nhập lại giao dịch mới.');
            return;
        }

        const cat = categories.find(c => c.id === newCategoryId);
        const hasSub = cat?.subcategories?.length > 0;

        try {
            await updateTransaction(user.uid, transactionId, { categoryId: newCategoryId, subcategoryId: '' });
            
            if (!hasSub) {
                await learnFromCorrection(user.uid, originalInput, newCategoryId, '');
            }

            setMessages(prev => prev.map(m => {
                if (m.id === msgId && m.transaction) {
                    return {
                        ...m,
                        text: hasSub ? 'Vui lòng chọn thêm danh mục phụ để AI học phân loại chính xác.' : '✅ Đã cập nhật danh mục và AI đã học ghi chú này!',
                        transaction: { ...m.transaction, categoryId: newCategoryId, subcategoryId: '' }
                    };
                }
                return m;
            }));

        } catch (error) {
            console.error('Update failed', error);
            alert('Lỗi cập nhật: ' + error.message);
        }
    };

    const handleSubcategoryChange = async (msgId, transactionId, categoryId, newSubcategoryId, originalInput) => {
        if (!user) return;
        if (!transactionId || typeof transactionId !== 'string') {
            alert('Không thể cập nhật giao dịch này do dữ liệu cũ bị lỗi. Vui lòng nhập lại giao dịch mới.');
            return;
        }

        try {
            await updateTransaction(user.uid, transactionId, { subcategoryId: newSubcategoryId });
            
            if (newSubcategoryId) {
                await learnFromCorrection(user.uid, originalInput, categoryId, newSubcategoryId);
            }

            setMessages(prev => prev.map(m => {
                if (m.id === msgId && m.transaction) {
                    return {
                        ...m,
                        text: newSubcategoryId ? '✅ Đã cập nhật danh mục và AI đã học ghi chú này!' : 'Vui lòng chọn danh mục phụ.',
                        transaction: { ...m.transaction, subcategoryId: newSubcategoryId }
                    };
                }
                return m;
            }));

        } catch (error) {
            console.error('Update failed', error);
            alert('Lỗi cập nhật: ' + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Chat Modal */}
            <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full md:w-[400px] lg:w-[450px] bg-slate-50 dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
                {/* Compact Header */}
                <div className="bg-white dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between relative z-20 shadow-sm">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button onClick={onClose} className="p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20 rounded-full flex items-center justify-center shadow-sm">
                                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 border border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-2 h-2 text-white" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] sm:text-[13px] font-bold text-slate-800 dark:text-white leading-tight">Trợ lý AI</span>
                                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400">Lưu trong 48h</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                    {/* Clear Chat Button */}
                    <button
                        onClick={handleClearChat}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-colors"
                        title="Xóa lịch sử chat"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Wallet Selector in Header */}
                    <div className="relative group">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 shadow-sm rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="mr-0.5 text-sm">{activeWallet?.icon}</span>
                            <span className="truncate max-w-[70px] sm:max-w-[90px]">{activeWallet?.name || 'Chọn ví'}</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {/* Dropdown with pt-2 to prevent closing gap */}
                        <div className="absolute right-0 top-full pt-2 z-50 hidden group-hover:block w-56">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl py-2 overflow-hidden">
                                {wallets?.map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => setActiveWallet(w)}
                                        className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${activeWallet?.id === w.id ? 'text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <span className="text-xl">{w.icon}</span> 
                                        <span className="flex-1 truncate">{w.name}</span>
                                        {activeWallet?.id === w.id && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-auto mb-1">
                                {msg.type === 'user' ? (
                                    <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                        {user?.photoURL ? <img src={user.photoURL} alt="user" className="w-8 h-8 rounded-full" /> : <User className="w-4 h-4 text-cyan-600" />}
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-emerald-600" />
                                    </div>
                                )}
                            </div>

                            {/* Bubble */}
                            <div className="flex flex-col gap-2">
                                {msg.text && (
                                    <div className={`px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${
                                        msg.type === 'user' 
                                            ? 'bg-cyan-600 text-white rounded-br-sm' 
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                )}

                                {/* Transaction Card */}
                                {msg.transaction && (
                                    <div 
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm min-w-[260px] cursor-pointer hover:border-emerald-500 transition-colors"
                                        onClick={() => openEditModal(msg.transaction)}
                                    >
                                        <div className={`flex justify-between items-center ${msg.transaction.type !== 'transfer' ? 'mb-3' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                                                    {categories.find(c => c.id === msg.transaction.categoryId)?.icon || '❓'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{msg.transaction.description}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {msg.transaction.type === 'transfer' 
                                                            ? `${wallets.find(w => w.id === msg.transaction.walletId)?.name || '?'} ➝ ${wallets.find(w => w.id === msg.transaction.transferTo)?.name || '?'}`
                                                            : (wallets.find(w => w.id === msg.transaction.walletId)?.name || activeWallet?.name)
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`font-bold text-base ${msg.transaction.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {msg.transaction.type === 'income' ? '+' : (msg.transaction.type === 'transfer' ? '⇄ ' : '-')}{formatCurrency(msg.transaction.amount)}
                                            </span>
                                        </div>
                                        
                                        {/* Category Selection / Edit */}
                                        {msg.transaction.type !== 'transfer' && msg.transaction.type !== 'loan_given' && msg.transaction.type !== 'loan_repaid' && (
                                        <div 
                                            className="border-t border-slate-100 dark:border-slate-700 pt-3 flex flex-col gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Phân loại danh mục</label>
                                            <div className="flex flex-col gap-2">
                                                <div className="relative">
                                                    <select 
                                                        value={msg.transaction.categoryId || ''}
                                                        onChange={(e) => handleCategoryChange(msg.id, msg.transaction.id, e.target.value, msg.transaction.description)}
                                                        className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                    >
                                                        <option value="">Chọn danh mục...</option>
                                                        <optgroup label="Chi tiêu">
                                                            {categories.filter(c => c.type === 'expense').map(c => (
                                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                            ))}
                                                        </optgroup>
                                                        <optgroup label="Thu nhập">
                                                            {categories.filter(c => c.type === 'income').map(c => (
                                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>

                                                {categories.find(c => c.id === msg.transaction.categoryId)?.subcategories?.length > 0 && (
                                                    <div className="relative">
                                                        <select
                                                            value={msg.transaction.subcategoryId || ''}
                                                            onChange={(e) => handleSubcategoryChange(msg.id, msg.transaction.id, msg.transaction.categoryId, e.target.value, msg.transaction.description)}
                                                            className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                        >
                                                            <option value="">Chọn danh mục phụ...</option>
                                                            {categories.find(c => c.id === msg.transaction.categoryId).subcategories.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] flex gap-2 flex-row">
                            <div className="flex-shrink-0 mt-auto mb-1">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-emerald-600" />
                                </div>
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-sm flex items-center gap-2 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
                                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Action Buttons & Input Area */}
            <div className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                <div className="flex gap-2 px-1">
                    <button 
                        onClick={() => setIsTransferModalOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-full border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-sm font-medium transition-colors"
                    >
                        <ArrowRightLeft className="w-4 h-4" /> Di chuyển quỹ
                    </button>
                    <button 
                        onClick={() => setIsRecurringModalOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-full border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-sm font-medium transition-colors"
                    >
                        <CalendarClock className="w-4 h-4" /> Giao dịch định kỳ
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 rounded-full p-1.5 border border-slate-200 dark:border-slate-700 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Nhập: ăn tối 100k, cf 20k..."
                        className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-slate-800 dark:text-slate-100 text-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center justify-center transition-colors shrink-0"
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </div>
                
                {/* Context Wallet Link at Bottom */}
                <div className="flex justify-center">
                    <button 
                        onClick={onOpenContextWallet}
                        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        <Bot className="w-4 h-4" />
                        <span>Ví ngữ cảnh của Yoogi</span>
                    </button>
                </div>
            </div>

            <TransferFundsModal 
                isOpen={isTransferModalOpen && !editingTransaction} 
                onClose={() => setIsTransferModalOpen(false)} 
                wallets={wallets} 
                onSave={handleTransferSave}
            />

            <TransferFundsModal
                isOpen={isEditTransferModalOpen}
                onClose={() => setIsEditTransferModalOpen(false)}
                wallets={wallets}
                onSave={handleSaveEdit}
                onDelete={(id) => {
                    // TransferFundsModal already prompts, but our handleDeleteEdit also prompts.
                    // Let's avoid double prompt. The user said TransferFundsModal prompts.
                    // Wait, in TransferFundsModal: "Bạn có chắc chắn muốn xóa giao dịch này?"
                    // So we shouldn't prompt again. I will update handleDeleteEdit not to prompt or just let it.
                    // Actually, I'll pass a separate handler to skip double prompt.
                    handleDeleteEditWithoutPrompt(id);
                }}
                initialData={editingTransaction}
            />

            <TransactionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                categories={categories}
                wallets={wallets}
                onSave={handleSaveEdit}
                onDelete={handleDeleteEdit}
                initialData={editingTransaction}
            />

            <RecurringTransactionsModal 
                isOpen={isRecurringModalOpen} 
                onClose={() => setIsRecurringModalOpen(false)} 
                categories={categories}
                user={user}
                wallets={wallets}
                recurringTransactions={recurringTransactions}
            />
        </div>
        </>
    );
};

export default AIChatModal;
