import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Pencil, Trash2, CheckCircle2, ChevronRight, ChevronDown, Settings } from 'lucide-react';
import { categorizeTransaction } from '../../utils/aiCategorizer';
import { addTransaction, incrementMemoryUsage, learnFromCorrection, updateTransaction } from '../../utils/firebaseHelpers';
import { formatCurrency } from '../../utils/formatters';

const AIChatModal = ({ isOpen, onClose, user, categories, aiMemories, wallets, selectedWalletId, onOpenContextWallet }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activeWallet, setActiveWallet] = useState(null);
    const messagesEndRef = useRef(null);

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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!input.trim() || !user || !activeWallet) return;

        const userMsgText = input.trim();
        const userMsg = { id: Date.now().toString(), type: 'user', text: userMsgText, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const result = await categorizeTransaction(userMsgText, categories, aiMemories);
            
            const transactionData = {
                type: result.type,
                amount: result.amount,
                description: result.description,
                categoryId: result.categoryId,
                subcategoryId: result.subcategoryId,
                date: result.date || new Date().toISOString(),
                walletId: activeWallet.id,
                aiCategorized: result.aiCategorized,
            };

            const docRef = await addTransaction(user.uid, transactionData);

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
                        text: hasSub ? 'Vui lòng chọn thêm danh mục con để AI học phân loại chính xác.' : '✅ Đã cập nhật danh mục và AI đã học ghi chú này!',
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
                        text: newSubcategoryId ? '✅ Đã cập nhật danh mục và AI đã học ghi chú này!' : 'Vui lòng chọn danh mục con.',
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
                {/* Header */}
                <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between relative z-20">
                    <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    {/* Settings icon removed */}
                </div>

                {/* Bot Intro Area - Fixed below header */}
                <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 px-4 pb-5 pt-1 flex flex-col items-center justify-center gap-1 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm relative">
                    <div className="relative mb-2 mt-1">
                        <div className="w-16 h-16 bg-gradient-to-tr from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20 rounded-full flex items-center justify-center shadow-sm">
                            <Bot className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Cuộc trò chuyện kéo dài 48 giờ</p>
                    
                    {/* Wallet Selector in Middle */}
                    <div className="relative group">
                        <button className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-full text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <span className="mr-1">{activeWallet?.icon}</span>
                            <span className="truncate max-w-[150px]">{activeWallet?.name || 'Chọn ví'}</span>
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>
                        {/* Dropdown with pt-2 to prevent closing gap */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 hidden group-hover:block w-56">
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
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm min-w-[260px]">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                                                    {categories.find(c => c.id === msg.transaction.categoryId)?.icon || '❓'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{msg.transaction.description}</p>
                                                    <p className="text-xs text-slate-500">{activeWallet?.name}</p>
                                                </div>
                                            </div>
                                            <span className={`font-bold text-base ${msg.transaction.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {msg.transaction.type === 'income' ? '+' : '-'}{formatCurrency(msg.transaction.amount)}
                                            </span>
                                        </div>
                                        
                                        {/* Category Selection / Edit */}
                                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex flex-col gap-2">
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
                                                            <option value="">Chọn danh mục con...</option>
                                                            {categories.find(c => c.id === msg.transaction.categoryId).subcategories.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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

            {/* Input Area */}
            <div className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-3">
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
                        <span>Ví ngữ cảnh của Rolly</span>
                    </button>
                </div>
            </div>
        </div>
        </>
    );
};

export default AIChatModal;
