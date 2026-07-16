import React from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const ChatMessageItem = ({ msg, user, categories, wallets, activeWallet, openEditModal, handleCategoryChange, handleSubcategoryChange }) => {
    return (
        <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className="flex-shrink-0 mt-auto mb-1">
                    {msg.type === 'user' ? (
                        user?.photoURL ? (
                            <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center overflow-hidden">
                                <img src={user.photoURL} alt="user" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden">
                            <img src="/logo.jpg" alt="AI Avatar" className="w-full h-full object-cover" />
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
                    {msg.transaction && (() => {
                        const showCategorySelect = msg.transaction.type !== 'transfer' && msg.transaction.type !== 'loan_given' && msg.transaction.type !== 'loan_repaid';
                        return (
                        <div 
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm min-w-[260px] cursor-pointer hover:border-emerald-500 transition-colors"
                            onClick={() => openEditModal(msg.transaction)}
                        >
                            <div className={`flex justify-between items-center ${showCategorySelect ? 'mb-3' : ''}`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm">
                                        {categories.find(c => c.id === msg.transaction.categoryId)?.icon || (msg.transaction.type === 'transfer' ? '💸' : '❓')}
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
                            {showCategorySelect && (
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
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default ChatMessageItem;
