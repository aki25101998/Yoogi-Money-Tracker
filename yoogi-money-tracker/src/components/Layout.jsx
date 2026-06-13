import React from 'react';
import {
    LayoutDashboard,
    CreditCard,
    Settings,
    ArrowRightLeft,
    LogOut,
    Moon,
    Sun,
    User,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'transactions', label: 'Giao dịch', icon: ArrowRightLeft },
    { id: 'installments', label: 'Trả góp', icon: CreditCard },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
];

const Layout = ({ children, activePage, onNavigate, user, onLogout, theme, onToggleTheme }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Desktop Sidebar */}
            <aside className={`fixed left-0 top-0 h-full z-30 hidden lg:flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'}`}>
                {/* Logo */}
                <div className={`flex items-center gap-3 px-4 h-16 border-b border-slate-100 dark:border-slate-700 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    {!sidebarCollapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">Yoogi Money Tracker</h1>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Personal Finance</span>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id || activePage?.startsWith(item.id + ':');
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                title={sidebarCollapsed ? item.label : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''} ${
                                    isActive
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                                {isActive && !sidebarCollapsed && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className={`border-t border-slate-100 dark:border-slate-700 p-3 space-y-2 ${sidebarCollapsed ? 'items-center' : ''}`}>
                    {/* Theme Toggle */}
                    <button
                        onClick={onToggleTheme}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        {theme === 'light' ? <Moon className="w-4 h-4 flex-shrink-0" /> : <Sun className="w-4 h-4 flex-shrink-0" />}
                        {!sidebarCollapsed && <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
                    </button>

                    {/* User Info */}
                    {user && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                            ) : (
                                <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            )}
                            {!sidebarCollapsed && (
                                <>
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
                                        {user.displayName || user.email}
                                    </span>
                                    <button onClick={onLogout} className="text-slate-400 hover:text-rose-500 transition-colors" title="Đăng xuất">
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between px-4 h-14">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-sm font-bold text-slate-800 dark:text-white">Yoogi</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onToggleTheme} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                        {user && (
                            <>
                                {user.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />}
                                <button onClick={onLogout} className="text-slate-400 hover:text-rose-500" title="Đăng xuất">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Bottom Tab Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-around h-16 px-1">
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id || activePage?.startsWith(item.id + ':');
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all min-w-[56px] ${
                                    isActive
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-400 dark:text-slate-500'
                                }`}
                            >
                                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Main Content */}
            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'} pt-14 lg:pt-0 pb-20 lg:pb-6`}>
                <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
