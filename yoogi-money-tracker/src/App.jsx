import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2, LogIn, Sparkles, Plus, PenSquare, ArrowRightLeft, Repeat } from 'lucide-react';
import { addTransaction } from './utils/supabaseHelpers';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useRecurringTransactions } from './hooks/useRecurringTransactions';

// Layout
import Layout from './components/Layout';

// Pages (Lazy Loaded)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const InstallmentsPage = lazy(() => import('./pages/InstallmentsPage'));
const DebtsPage = lazy(() => import('./pages/DebtsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Modals
import AIChatModal from './components/chat/AIChatModal';
import TransactionModal from './components/modals/TransactionModal';
import AIContextModal from './components/modals/AIContextModal';
import TransferFundsModal from './components/modals/TransferFundsModal';
import AddRecurringTransactionModal from './components/modals/AddRecurringTransactionModal';

// Components
import GlobalErrorBanner from './components/GlobalErrorBanner';
import VersionHistorySidebar from './components/VersionHistorySidebar';

export default function App() {
    const { user, isAuthLoading, handleGoogleLogin, handleLogout } = useAuth();
    const { 
        installments, transactions, categories, aiMemories, abbreviations,
        wallets, payers, debtors, debts, recurringTransactions, lenders,
        userSettings, isDataLoading 
    } = useAppData(user);

    useRecurringTransactions(user, recurringTransactions);

    // Global Modals State
    const [isGlobalFabOpen, setIsGlobalFabOpen] = useState(false);
    const [isGlobalAIChatOpen, setIsGlobalAIChatOpen] = useState(false);
    const [isGlobalContextWalletOpen, setIsGlobalContextWalletOpen] = useState(false);
    const [isGlobalTransactionOpen, setIsGlobalTransactionOpen] = useState(false);
    const [isGlobalTransferOpen, setIsGlobalTransferOpen] = useState(false);
    const [isGlobalRecurringOpen, setIsGlobalRecurringOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [activePage, setActivePage] = useState('dashboard');

    // --- Theme ---
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

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleGlobalSaveTransaction = async (formData) => {
        if (!user) return;
        try {
            await addTransaction(user.uid, { ...formData, aiCategorized: false });
            setIsGlobalTransactionOpen(false);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    // --- Login Screen ---
    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 transition-colors">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 sm:p-12 max-w-md w-full text-center">
                    {/* Logo */}
                    <div className="relative inline-block mb-8">
                        <img src="/logo.jpg" alt="Yoogi" className="w-20 h-20 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none object-cover" />
                        <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-1.5 border-2 border-white dark:border-slate-800 shadow-sm">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-2">
                        Yoogi Money Tracker
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-1 text-sm">
                        Personal Finance Manager
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mb-8 max-w-xs mx-auto">
                        Quản lý thu chi hằng ngày • AI phân loại tự động • Theo dõi trả góp
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { icon: '🤖', label: 'AI thông minh' },
                            { icon: '📊', label: 'Biểu đồ' },
                            { icon: '💳', label: 'Trả góp' },
                        ].map((f, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                <div className="text-xl mb-1">{f.icon}</div>
                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{f.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <LogIn className="w-5 h-5" />
                        Đăng nhập với Google
                    </button>
                </div>
            </div>
        );
    }

    // --- Main App (Logged In) ---
    const renderPage = () => {
        if (isDataLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-emerald-500" />
                    <p className="text-sm">Đang tải dữ liệu...</p>
                </div>
            );
        }

        let PageComponent = null;

        if (activePage === 'dashboard') {
            PageComponent = (
                <DashboardPage 
                    user={user} 
                    userSettings={userSettings}
                    transactions={transactions} 
                    categories={categories}
                    aiMemories={aiMemories}
                    wallets={wallets}
                    payers={debtors}
                    recurringTransactions={recurringTransactions}
                    onNavigate={setActivePage}
                />
            );
        } else if (activePage === 'transactions') {
            PageComponent = (
                <TransactionsPage
                    user={user}
                    userSettings={userSettings}
                    transactions={transactions}
                    categories={categories}
                    aiMemories={aiMemories}
                    wallets={wallets}
                    debts={debts}
                />
            );
        } else if (activePage === 'installments') {
            PageComponent = (
                <InstallmentsPage
                    user={user}
                    items={installments}
                    payers={payers}
                    lenders={lenders}
                    isLoading={false}
                    wallets={wallets}
                    transactions={transactions}
                    categories={categories}
                />
            );
        } else if (activePage === 'debts') {
            PageComponent = (
                <DebtsPage
                    user={user}
                    debts={debts}
                    transactions={transactions}
                    wallets={wallets}
                    categories={categories}
                    payers={debtors}
                />
            );
        } else if (activePage?.startsWith('settings')) {
            const initialTab = activePage.split(':')[1] || 'wallets';
            PageComponent = (
                <SettingsPage
                    user={user}
                    userSettings={userSettings}
                    categories={categories}
                    aiMemories={aiMemories}
                    abbreviations={abbreviations}
                    wallets={wallets}
                    payers={payers}
                    initialTab={initialTab}
                />
            );
        }

        return (
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-3 text-emerald-500" />
                    <p className="text-sm">Đang tải nội dung...</p>
                </div>
            }>
                {PageComponent}
            </Suspense>
        );
    };

    return (
            <Layout
                activePage={activePage}
                onNavigate={setActivePage}
                user={user}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenHistory={() => setIsHistoryOpen(true)}
            >
            {renderPage()}

            {/* Global FAB Menu */}
            {user && (
                <>
                    {isGlobalFabOpen && (
                        <div className="fixed inset-0 z-30 flex" onClick={() => setIsGlobalFabOpen(false)}>
                            <div className="absolute bottom-36 right-6 md:bottom-24 md:right-8 flex flex-col gap-3 items-end">
                                <button 
                                    onClick={() => { setIsGlobalFabOpen(false); setIsGlobalRecurringOpen(true); }}
                                    className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Giao dịch định kỳ</span>
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                        <Repeat className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    </div>
                                </button>
                                <button 
                                    onClick={() => { setIsGlobalFabOpen(false); setIsGlobalTransferOpen(true); }}
                                    className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Chuyển tiền</span>
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <ArrowRightLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </button>
                                <button 
                                    onClick={() => { setIsGlobalFabOpen(false); setIsGlobalTransactionOpen(true); }}
                                    className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nhập thủ công</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                        <PenSquare className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                </button>
                                <button 
                                    onClick={() => { setIsGlobalFabOpen(false); setIsGlobalAIChatOpen(true); }}
                                    className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 transition-colors"
                                >
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Nhập bằng AI</span>
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center overflow-hidden">
                                        <img src="/logo.jpg" alt="AI Avatar" className="w-full h-full object-cover" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setIsGlobalFabOpen(!isGlobalFabOpen)}
                        className={`fixed bottom-20 right-6 md:bottom-6 md:right-8 w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg transition-all z-40 ${isGlobalFabOpen ? 'bg-slate-600 rotate-45 scale-90' : 'bg-slate-800 dark:bg-cyan-600 hover:scale-105 active:scale-95'}`}
                    >
                        <Plus className="w-6 h-6" />
                    </button>

                    <TransactionModal
                        isOpen={isGlobalTransactionOpen}
                        onClose={() => setIsGlobalTransactionOpen(false)}
                        onSave={handleGlobalSaveTransaction}
                        categories={categories}
                        wallets={wallets}
                    />

                    <TransferFundsModal
                        isOpen={isGlobalTransferOpen}
                        onClose={() => setIsGlobalTransferOpen(false)}
                        wallets={wallets}
                        onSave={async (formData) => {
                            if (!user) return;
                            try {
                                await addTransaction(user.uid, formData);
                                setIsGlobalTransferOpen(false);
                            } catch (err) {
                                alert('Lỗi: ' + err.message);
                            }
                        }}
                    />

                    <AddRecurringTransactionModal
                        isOpen={isGlobalRecurringOpen}
                        onClose={() => setIsGlobalRecurringOpen(false)}
                        categories={categories}
                        user={user}
                        wallets={wallets}
                    />
                    
                    <AIChatModal 
                        isOpen={isGlobalAIChatOpen}
                        onClose={() => setIsGlobalAIChatOpen(false)}
                        user={user}
                        categories={categories}
                        aiMemories={aiMemories}
                        abbreviations={abbreviations}
                        wallets={wallets}
                        payers={payers}
                        debtors={debtors}
                        debts={debts}
                        recurringTransactions={recurringTransactions}
                        onOpenContextWallet={() => setIsGlobalContextWalletOpen(true)}
                    />

                    <AIContextModal
                        isOpen={isGlobalContextWalletOpen}
                        onClose={() => setIsGlobalContextWalletOpen(false)}
                        user={user}
                        aiMemories={aiMemories}
                        abbreviations={abbreviations}
                        categories={categories}
                    />
                </>
            )}

            {user && (
                <VersionHistorySidebar 
                    isOpen={isHistoryOpen} 
                    onClose={() => setIsHistoryOpen(false)} 
                    user={user} 
                />
            )}
            
            <GlobalErrorBanner />
        </Layout>
    );
}
