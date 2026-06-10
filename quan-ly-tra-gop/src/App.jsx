import React, { useState, useEffect } from 'react';
import { Loader2, LogIn, Sparkles, CreditCard } from 'lucide-react';
import {
    signInWithPopup, signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    collection, onSnapshot, query
} from 'firebase/firestore';

// Config
import { auth, db, googleProvider, APP_ID } from './config/firebase';

// Layout
import Layout from './components/Layout';

// Pages
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import InstallmentsPage from './pages/InstallmentsPage';
import CategoriesPage from './pages/CategoriesPage';
import AINotesPage from './pages/AINotesPage';

// Helpers
import {
    seedDefaultCategories,
    subscribeCategories,
    subscribeTransactions,
    subscribeAIMemory,
} from './utils/firebaseHelpers';

export default function App() {
    // --- Auth ---
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // --- Data ---
    const [installments, setInstallments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [aiMemories, setAiMemories] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    // --- Navigation ---
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
        if (!auth) {
            setIsAuthLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Data Subscriptions ---
    useEffect(() => {
        if (!user) {
            setInstallments([]);
            setTransactions([]);
            setCategories([]);
            setAiMemories([]);
            setIsDataLoading(false);
            return;
        }

        setIsDataLoading(true);

        // Seed default categories if needed
        seedDefaultCategories(user.uid).then(() => {
            console.log('Categories check complete');
        }).catch(err => {
            console.error('Error seeding categories:', err);
        });

        // Subscribe to installments (legacy path)
        const instQuery = query(
            collection(db, 'artifacts', APP_ID, 'users', user.uid, 'installments')
        );
        const unsubInst = onSnapshot(instQuery, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            setInstallments(items);
        });

        // Subscribe to categories
        const unsubCats = subscribeCategories(user.uid, setCategories);

        // Subscribe to transactions
        const unsubTxns = subscribeTransactions(user.uid, setTransactions);

        // Subscribe to AI Memory
        const unsubMem = subscribeAIMemory(user.uid, setAiMemories);

        // Mark loading as done after a short delay to allow subscriptions to initialize
        const timer = setTimeout(() => setIsDataLoading(false), 500);

        return () => {
            unsubInst();
            unsubCats();
            unsubTxns();
            unsubMem();
            clearTimeout(timer);
        };
    }, [user]);

    // --- Auth Handlers ---
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
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-1.5 border-2 border-white dark:border-slate-800 shadow-sm">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-2">
                        Sổ Quỹ Cá Nhân
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

                    {!auth && (
                        <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30 mt-4">
                            ⚠️ Lỗi cấu hình Firebase. Vui lòng kiểm tra file .env
                        </p>
                    )}
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

        switch (activePage) {
            case 'dashboard':
                return (
                    <DashboardPage
                        transactions={transactions}
                        categories={categories}
                        installmentItems={installments}
                    />
                );
            case 'transactions':
                return (
                    <TransactionsPage
                        user={user}
                        transactions={transactions}
                        categories={categories}
                        aiMemories={aiMemories}
                    />
                );
            case 'installments':
                return (
                    <InstallmentsPage
                        user={user}
                        items={installments}
                        isLoading={false}
                    />
                );
            case 'categories':
                return (
                    <CategoriesPage
                        user={user}
                        categories={categories}
                    />
                );
            case 'ai-notes':
                return (
                    <AINotesPage
                        user={user}
                        aiMemories={aiMemories}
                        categories={categories}
                    />
                );
            default:
                return null;
        }
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
        </Layout>
    );
}
