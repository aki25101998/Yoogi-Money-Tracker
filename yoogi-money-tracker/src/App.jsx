import React, { useState, useEffect } from 'react';
import { Loader2, LogIn, Sparkles, CreditCard, Plus, PenSquare, Bot, ArrowRightLeft, Repeat } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from './config/supabase';

// Layout
import Layout from './components/Layout';

// Pages
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import InstallmentsPage from './pages/InstallmentsPage';
import DebtsPage from './pages/DebtsPage';
import SettingsPage from './pages/SettingsPage';

// Modals
import AIChatModal from './components/chat/AIChatModal';
import TransactionModal from './components/modals/TransactionModal';
import AIContextModal from './components/modals/AIContextModal';
import TransferFundsModal from './components/modals/TransferFundsModal';
import AddRecurringTransactionModal from './components/modals/AddRecurringTransactionModal';

// Components
import GlobalErrorBanner from './components/GlobalErrorBanner';

// Helpers
import {
    seedDefaultCategories,
    ensureRequiredCategories,
    subscribeCategories,
    subscribeTransactions,
    subscribeAIMemory,
    subscribeWallets,
    subscribePayers,
    subscribeDebtors,
    subscribeDebts,
    subscribeRecurringTransactions,
    addTransaction,
    updateRecurringTransaction,
    subscribeLenders,
    subscribeUserSettings,
    subscribeInstallments,
    subscribeAbbreviations,
    saveVersion,
    cleanupOldAutoVersions
} from './utils/supabaseHelpers';



export default function App() {
    // --- Auth ---
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // --- Data ---
    const [installments, setInstallments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [aiMemories, setAiMemories] = useState([]);
    const [abbreviations, setAbbreviations] = useState([]);

    // Global Modals State
    const [isGlobalFabOpen, setIsGlobalFabOpen] = useState(false);
    const [isGlobalAIChatOpen, setIsGlobalAIChatOpen] = useState(false);
    const [isGlobalContextWalletOpen, setIsGlobalContextWalletOpen] = useState(false);
    const [isGlobalTransactionOpen, setIsGlobalTransactionOpen] = useState(false);
    const [isGlobalTransferOpen, setIsGlobalTransferOpen] = useState(false);
    const [isGlobalRecurringOpen, setIsGlobalRecurringOpen] = useState(false);
    const [wallets, setWallets] = useState([]);
    const [payers, setPayers] = useState([]);
    const [debtors, setDebtors] = useState([]);
    const [debts, setDebts] = useState([]);
    const [recurringTransactions, setRecurringTransactions] = useState([]);
    const [lenders, setLenders] = useState([]);
    const [userSettings, setUserSettings] = useState({ monthStartDay: 1 });
    const [isDataLoading, setIsDataLoading] = useState(true);

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

    // --- Auth Effect ---
    useEffect(() => {
        // Initialize GoogleAuth plugin for Capacitor
        if (window.Capacitor || navigator.userAgent.includes('Capacitor')) {
            GoogleAuth.initialize({
                clientId: '634476807825-pa9k25klhpspqupgdgs2b9q3utjdk663.apps.googleusercontent.com',
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            });
        }

        const processUser = (u) => {
            if (!u) return null;
            const photoURL = u.user_metadata?.avatar_url || u.user_metadata?.picture || u.photoURL || null;
            const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.displayName || null;
            return {
                ...u,
                uid: u.id,
                photoURL,
                displayName
            };
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(processUser(session?.user));
            setIsAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(processUser(session?.user));
        });

        return () => subscription.unsubscribe();
    }, []);

    // --- Data Subscriptions ---
    useEffect(() => {
        if (!user) {
            setInstallments([]);
            setTransactions([]);
            setCategories([]);
            setAiMemories([]);
            setAbbreviations([]);
            setWallets([]);
            setPayers([]);
            setDebtors([]);
            setLenders([]);
            setUserSettings({ monthStartDay: 1 });
            setIsDataLoading(false);
            return;
        }

        setIsDataLoading(true);

        // Seed default categories if needed
        seedDefaultCategories(user.uid).then((seeded) => {
            if (!seeded) {
                return ensureRequiredCategories(user.uid);
            }
        }).then(() => {
            console.log('Categories check & migration complete');
        }).catch(err => {
            console.error('Error with categories:', err);
        });

        // --- Loading State Tracking ---
        let loadFlags = { txns: false, wallets: false, settings: false };
        const checkDataLoaded = (key) => {
            if (!loadFlags[key]) {
                loadFlags[key] = true;
                if (loadFlags.txns && loadFlags.wallets && loadFlags.settings) {
                    setIsDataLoading(false);
                }
            }
        };

        // Subscribe to installments
        const unsubInst = subscribeInstallments(user.uid, setInstallments);
        const unsubCats = subscribeCategories(user.uid, setCategories);

        // Subscribe to transactions
        const unsubTxns = subscribeTransactions(user.uid, (data) => {
            setTransactions(data);
            checkDataLoaded('txns');
        });

        // Subscribe to AI Memory
        const unsubMem = subscribeAIMemory(user.uid, setAiMemories);

        // Subscribe to Wallets
        const unsubWallets = subscribeWallets(user.uid, (data) => {
            setWallets(data);
            checkDataLoaded('wallets');
        });

        // Subscribe to Payers
        const unsubPayers = subscribePayers(user.uid, setPayers);

        // Subscribe to Debtors
        const unsubDebtors = subscribeDebtors(user.uid, setDebtors);

        // Subscribe to Debts
        const unsubDebts = subscribeDebts(user.uid, setDebts);

        // Subscribe to Recurring Transactions
        const unsubRecurring = subscribeRecurringTransactions(user.uid, setRecurringTransactions);

        // Subscribe to Lenders
        const unsubLenders = subscribeLenders(user.uid, setLenders);

        // Subscribe to User Settings
        const unsubSettings = subscribeUserSettings(user.uid, (data) => {
            setUserSettings(data);
            checkDataLoaded('settings');
        });

        // Subscribe to Abbreviations
        const unsubAbbreviations = subscribeAbbreviations(user.uid, setAbbreviations);

        return () => {
            unsubInst();
            unsubCats();
            unsubTxns();
            unsubMem();
            unsubWallets();
            unsubPayers();
            unsubDebtors();
            unsubDebts();
            unsubRecurring();
            unsubLenders();
            unsubSettings();
            unsubAbbreviations();
        };
    }, [user?.uid]);

    // --- Auto Backup & Cleanup ---
    useEffect(() => {
        if (!user) return;

        // Clean up old auto versions on app load
        cleanupOldAutoVersions(user.uid);

        let timeoutId;
        const handleMutate = (e) => {
            // Ignore mutation events that are just UI refreshes for 'all' during restore
            if (e.detail === 'all') return;
            
            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
                try {
                    await saveVersion(user.uid, 'Tự động lưu');
                    console.log('Auto-saved new version');
                } catch (error) {
                    console.error('Failed to auto-save version:', error);
                }
            }, 5000);
        };

        window.addEventListener('supabase_mutate', handleMutate);

        return () => {
            window.removeEventListener('supabase_mutate', handleMutate);
            clearTimeout(timeoutId);
        };
    }, [user?.uid]);

    // --- Recurring Transactions Check Effect ---
    useEffect(() => {
        if (!user || recurringTransactions.length === 0) return;

        const intervalId = setInterval(async () => {
            const now = new Date();
            for (const rt of recurringTransactions) {
                const nextDate = new Date(rt.nextDate);
                if (now >= nextDate) {
                    // It's time to execute this recurring transaction
                    try {
                        const transactionData = {
                            type: rt.type,
                            amount: rt.amount,
                            description: rt.description,
                            categoryId: rt.categoryId,
                            subcategoryId: rt.subcategoryId || '',
                            date: now.toISOString(),
                            time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                            walletId: rt.walletId,
                            isRecurring: true,
                            recurringId: rt.id
                        };
                        await addTransaction(user.uid, transactionData);

                        // Calculate next date
                        const newNextDate = new Date(nextDate);
                        const value = parseInt(rt.intervalValue) || 1;
                        if (rt.intervalUnit === 'Phút') {
                            newNextDate.setMinutes(newNextDate.getMinutes() + value);
                        } else if (rt.intervalUnit === 'Ngày') {
                            newNextDate.setDate(newNextDate.getDate() + value);
                        } else if (rt.intervalUnit === 'Tuần') {
                            newNextDate.setDate(newNextDate.getDate() + value * 7);
                        } else if (rt.intervalUnit === 'Tháng') {
                            newNextDate.setMonth(newNextDate.getMonth() + value);
                        } else if (rt.intervalUnit === 'Năm') {
                            newNextDate.setFullYear(newNextDate.getFullYear() + value);
                        }

                        // If the newNextDate is still in the past (e.g. app was offline), catch it up to future
                        while (newNextDate <= now) {
                            if (rt.intervalUnit === 'Phút') newNextDate.setMinutes(newNextDate.getMinutes() + value);
                            else if (rt.intervalUnit === 'Ngày') newNextDate.setDate(newNextDate.getDate() + value);
                            else if (rt.intervalUnit === 'Tuần') newNextDate.setDate(newNextDate.getDate() + value * 7);
                            else if (rt.intervalUnit === 'Tháng') newNextDate.setMonth(newNextDate.getMonth() + value);
                            else if (rt.intervalUnit === 'Năm') newNextDate.setFullYear(newNextDate.getFullYear() + value);
                        }

                        await updateRecurringTransaction(user.uid, rt.id, {
                            nextDate: newNextDate.toISOString()
                        });
                        console.log("Executed recurring transaction:", rt.description);
                    } catch (error) {
                        console.error("Error executing recurring transaction:", error);
                    }
                }
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [user, recurringTransactions]);

    const isMobileOrWebView = () => {
        return /Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth <= 768
            || 'ontouchstart' in window;
    };

    const handleGoogleLogin = async () => {
        try {
            if (isMobileOrWebView()) {
                const googleUser = await GoogleAuth.signIn();
                if (googleUser && googleUser.authentication) {
                    await supabase.auth.signInWithIdToken({
                        provider: 'google',
                        token: googleUser.authentication.idToken,
                    });
                } else {
                    throw new Error("Không lấy được token xác thực từ Google.");
                }
            } else {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google'
                });
                if (error) throw error;
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("Đăng nhập thất bại: " + error.message);
        }
    };

    const handleLogout = async () => {
        try { await supabase.auth.signOut(); } catch (error) { console.error("Logout Error:", error); }
    };

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

        if (activePage === 'dashboard') {
            return (
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
            return (
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
            return (
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
            return (
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
            return (
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
        return null;
    };

    return (
            <Layout
                activePage={activePage}
                onNavigate={setActivePage}
                user={user}
                onLogout={handleLogout}
                theme={theme}
                onToggleTheme={toggleTheme}
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
            
            <GlobalErrorBanner />
        </Layout>
    );
}
