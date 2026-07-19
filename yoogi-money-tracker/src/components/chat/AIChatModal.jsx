import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Pencil, Trash2, CheckCircle2, ChevronRight, ChevronDown, Settings, CalendarClock, ArrowRightLeft } from 'lucide-react';
import { categorizeTransaction } from '../../utils/aiCategorizer';
import { addTransaction, incrementMemoryUsage, learnFromCorrection, processCorrections, updateTransaction, deleteTransaction, addDebt, updateDebt, addDebtor, subscribeAIChatHistory, updateAIChatHistory, clearAIChatHistory } from '../../utils/supabaseHelpers';
import { addAbbreviation, updateAbbreviation } from '../../services/coreService';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../config/supabase';
import TransferFundsModal from '../modals/TransferFundsModal';
import TransactionModal from '../modals/TransactionModal';
import ChatMessageItem from './ChatMessageItem';
import RecurringTransactionsModal from '../modals/RecurringTransactionsModal';
const AIChatModal = ({ isOpen, onClose, user, categories, aiMemories, abbreviations, wallets, payers, debtors, debts, recurringTransactions, selectedWalletId, onOpenContextWallet }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeWallet, setActiveWallet] = useState(null);
    const messagesEndRef = useRef(null);
    const isLocalUpdateRef = useRef(false);
    
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
        
        const welcomeMessage = { id: 'welcome', type: 'bot', text: 'Xin chào! 👋 Hãy bắt đầu thêm giao dịch của bạn tại đây nhé!', timestamp: Date.now() };

        // Attempt to migrate from localStorage first if Firebase is empty
        const historyKey = `ai_chat_history_${user.uid}_${activeWallet.id}`;
        const savedHistory = localStorage.getItem(historyKey);
        let localMessages = null;
        if (savedHistory) {
            try {
                localMessages = JSON.parse(savedHistory);
            } catch (e) {
                console.error("Failed to parse local history", e);
            }
        }

        const unsubscribe = subscribeAIChatHistory(user.uid, activeWallet.id, async (firebaseMessages) => {
            if (firebaseMessages === null) {
                // No firebase document exists, check local storage
                if (localMessages && localMessages.length > 0) {
                    setMessages(localMessages);
                    await updateAIChatHistory(user.uid, activeWallet.id, localMessages);
                } else {
                    setMessages([welcomeMessage]);
                }
            } else {
                // Use firebase messages
                
                // Fix bad transaction IDs from previous bug
                firebaseMessages.forEach(m => {
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
                const filtered = firebaseMessages.filter(m => (now - m.timestamp) < 48 * 60 * 60 * 1000);
                
                const userMessages = filtered.filter(m => m.type === 'user');
                if (userMessages.length > 0) {
                    setMessages(filtered);
                } else {
                    setMessages([welcomeMessage]);
                }
            }
            
            // Clean up localStorage after migration attempt
            if (savedHistory) {
                localStorage.removeItem(historyKey);
            }
        });

        return () => unsubscribe();
    }, [isOpen, activeWallet, user]);

    // Save history when messages change, but skip the initial load
    useEffect(() => {
        if (!isOpen || !activeWallet || !user) return;
        
        if (isLocalUpdateRef.current) {
            isLocalUpdateRef.current = false;
            // Ensure we don't save just the welcome message unless there are user messages
            if (messages.length > 1 || (messages.length === 1 && messages[0].id !== 'welcome')) {
                 updateAIChatHistory(user.uid, activeWallet.id, messages);
            }
        }
        scrollToBottom();
    }, [messages, user, activeWallet, isOpen]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleClearChat = async () => {
        if (!window.confirm('Xóa toàn bộ lịch sử chat? Hành động này không thể hoàn tác.')) return;
        if (user && activeWallet) {
            await clearAIChatHistory(user.uid, activeWallet.id);
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

            const docRef = await addTransaction(user.uid, transferTxn);

            const aiMsg = {
                id: Date.now().toString(),
                type: 'bot',
                text: `Đã ghi nhận lệnh chuyển ${formatCurrency(transferData.amount)} từ ví này sang ví khác.`,
                transaction: { ...transferTxn, id: docRef.id, originalInput: transferData.description || 'Chuyển tiền' },
                timestamp: Date.now()
            };
            isLocalUpdateRef.current = true;
            setMessages(prev => [...prev, aiMsg]);
            
        } catch (error) {
            console.error("Error saving transfer:", error);
        }
    };

    const handleSaveEdit = async (updatedData) => {
        if (!user || !editingTransaction) return;

        try {
            let learnedAbbreviation = false;

            // --- Abbreviation Learning ---
            const newDescription = updatedData.description?.trim();
            const oldDescription = editingTransaction.description?.trim() || editingTransaction.note?.trim();

            if (newDescription && oldDescription && newDescription !== oldDescription) {
                if (editingTransaction.originalInput) {
                    let text = editingTransaction.originalInput.replace(/\b\d+([.,]\d+)?\s*(k|tr|triệu|ngàn|nghìn|đ|vnd)\b/gi, '');
                    text = text.replace(/\b\d+([.,]\d+)?\b/gi, '');
                    const shortForm = text.replace(/\s+/g, ' ').trim().toLowerCase();
                    
                    if (shortForm && shortForm.length > 0 && shortForm !== newDescription.toLowerCase()) {
                        const existingAbbr = abbreviations?.find(a => a.shortForm?.toLowerCase() === shortForm);
                        try {
                            if (existingAbbr) {
                                if (existingAbbr.longForm !== newDescription) {
                                    await updateAbbreviation(user.uid, existingAbbr.id, { longForm: newDescription });
                                    learnedAbbreviation = true;
                                }
                            } else {
                                await addAbbreviation(user.uid, { shortForm, longForm: newDescription });
                                learnedAbbreviation = true;
                            }
                        } catch (abbrErr) {
                            console.error("Lỗi khi lưu từ viết tắt:", abbrErr);
                        }
                    }
                }
            }

            await updateTransaction(user.uid, editingTransaction.id, updatedData);
            
            // --- Sync Debt if amount changed ---
            const diff = (parseFloat(updatedData.amount) || 0) - (parseFloat(editingTransaction.amount) || 0);
            if (diff !== 0) {
                if (editingTransaction.type === 'loan_given' && editingTransaction.debtId) {
                    const debt = debts?.find(d => d.id === editingTransaction.debtId);
                    if (debt) {
                        const newTotal = debt.totalAmount + diff;
                        const newRepaid = debt.repaidAmount || 0;
                        const newStatus = newRepaid >= newTotal ? 'completed' : 'active';
                        await updateDebt(user.uid, debt.id, { totalAmount: newTotal, repaidAmount: newRepaid, status: newStatus });
                    }
                } else if (editingTransaction.type === 'loan_repaid' && editingTransaction.debtId) {
                    const debt = debts?.find(d => d.id === editingTransaction.debtId);
                    if (debt) {
                        const newRepaid = Math.max(0, (debt.repaidAmount || 0) + diff);
                        const newStatus = newRepaid >= debt.totalAmount ? 'completed' : 'active';
                        await updateDebt(user.uid, debt.id, { repaidAmount: newRepaid, status: newStatus });
                    }
                }
            }

            isLocalUpdateRef.current = true;
            setMessages(prev => prev.map(msg => {
                if (msg.transaction && msg.transaction.id === editingTransaction.id) {
                    let newText = msg.text;
                    if (learnedAbbreviation) {
                        newText = '✅ Đã cập nhật mô tả và AI đã học từ viết tắt này!';
                    }
                    return { ...msg, text: newText, transaction: { ...msg.transaction, ...updatedData } };
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
            isLocalUpdateRef.current = true;
            setMessages(prev => prev.filter(msg => !(msg.transaction && msg.transaction.id === id)));
            setIsEditModalOpen(false);
            setIsEditTransferModalOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            alert("Lỗi khi xóa: " + error.message);
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
        setInput('');
        
        const transactionInputs = userMsgText.split(',').map(s => s.trim()).filter(Boolean);

        for (let i = 0; i < transactionInputs.length; i++) {
            const singleInput = transactionInputs[i];
            const timestamp = Date.now();
            const userMsg = { id: timestamp.toString() + '-user-' + i, type: 'user', text: singleInput, timestamp };
            isLocalUpdateRef.current = true;
            setMessages(prev => [...prev, userMsg]);
            setIsTyping(true);

            try {
                let processedInput = singleInput;
                if (abbreviations && abbreviations.length > 0) {
                    abbreviations.forEach(abbr => {
                        if (abbr.shortForm && abbr.longForm) {
                            // Match exact word, case insensitive
                            const regex = new RegExp(`\\b${abbr.shortForm}\\b`, 'gi');
                            processedInput = processedInput.replace(regex, abbr.longForm);
                        }
                    });
                }

                const result = await categorizeTransaction(processedInput, categories, aiMemories, wallets, payers, debtors);
                
                let docRef;
            let finalWalletId = result.walletId || activeWallet.id;
            let transactionData;

            const getCurrentTime = () => {
                const now = new Date();
                return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            };

            if (result.type === 'loan_given' || result.type === 'loan_repaid') {
                const amountNum = parseFloat(result.amount) || 0;
                let debtId = null;
                // AI có thể trả về tên với format "Phúc" (đã viết hoa)
                let personName = result.personName || 'Người vô danh';

                // Tự động tạo người mượn mới nếu chưa có
                if (personName !== 'Người vô danh' && debtors) {
                    const existingDebtor = debtors.find(d => d.name.trim().toLowerCase() === personName.trim().toLowerCase());
                    if (existingDebtor) {
                        personName = existingDebtor.name; // Đảm bảo dùng đúng tên đã lưu
                    } else {
                        // Người này chưa có trong danh sách -> Tạo mới
                        try {
                            await addDebtor(user.uid, { name: personName });
                        } catch (err) {
                            console.error('Không thể tạo người mượn mới:', err);
                        }
                    }
                }

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
                    const { data } = await supabase.from('debts').select('*').eq('user_id', user.uid).eq('personName', personName).eq('status', 'active').limit(1);
                    
                    if (data && data.length > 0) {
                        const debtData = data[0];
                        debtId = debtData.id;
                        
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
                        ? `${personName} mượn${result.debtNotes ? ': ' + result.debtNotes : ''}` 
                        : `${personName} trả nợ${result.debtNotes ? ': ' + result.debtNotes : ''}`,
                    categoryId: categories.find(c => c.type === result.type)?.id || '',
                    subcategoryId: '',
                    date: result.date || new Date().toISOString(),
                    time: getCurrentTime(),
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
                    categoryId: categories.find(c => c.type === 'transfer')?.id || '',
                    subcategoryId: '',
                    date: result.date || new Date().toISOString(),
                    time: getCurrentTime(),
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
                    time: getCurrentTime(),
                    walletId: finalWalletId,
                    aiCategorized: result.aiCategorized,
                };
                docRef = await addTransaction(user.uid, transactionData);
            }

            if (result.memoryId) {
                await incrementMemoryUsage(user.uid, result.memoryId);
            }

            const botTimestamp = Date.now();
            const botMsg = {
                id: botTimestamp.toString() + '-bot-' + i,
                type: 'bot',
                text: 'Tuyệt vời! Đã ghi nhận giao dịch của bạn.',
                transaction: { ...transactionData, id: docRef.id, originalInput: singleInput },
                timestamp: botTimestamp
            };

            isLocalUpdateRef.current = true;
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const botTimestamp = Date.now();
            const errorMsg = {
                id: botTimestamp.toString() + '-err-' + i,
                type: 'bot',
                text: `❌ Lỗi: ${error.message}`,
                timestamp: botTimestamp
            };
            isLocalUpdateRef.current = true;
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
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

            isLocalUpdateRef.current = true;
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

            isLocalUpdateRef.current = true;
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
                                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-tr from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
                                    <img src="/logo.jpg" alt="AI Avatar" className="w-full h-full object-cover" />
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
                    {/* User Avatar (Mobile Only) */}
                    <div className="lg:hidden flex-shrink-0">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full shadow-sm object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )}
                    </div>

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
                    <ChatMessageItem 
                        key={msg.id}
                        msg={msg}
                        user={user}
                        categories={categories}
                        wallets={wallets}
                        activeWallet={activeWallet}
                        openEditModal={openEditModal}
                        handleCategoryChange={handleCategoryChange}
                        handleSubcategoryChange={handleSubcategoryChange}
                    />
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] flex gap-2 flex-row">
                            <div className="flex-shrink-0 mt-auto mb-1">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden">
                                    <img src="/logo.jpg" alt="AI Avatar" className="w-full h-full object-cover" />
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
                        <img src="/logo.jpg" alt="Context" className="w-5 h-5 rounded-full object-cover" />
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
                onDelete={handleDeleteEditWithoutPrompt}
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
