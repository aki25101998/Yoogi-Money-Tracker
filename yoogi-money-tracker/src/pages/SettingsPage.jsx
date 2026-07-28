import React, { useState, useEffect } from 'react';
import { Settings, Wallet, Users, FolderTree, Brain, Database } from 'lucide-react';

import WalletsSettings from '../components/settings/WalletsSettings';
import CategoriesPage from './CategoriesPage'; // Reusing existing page as a component
import AINotesPage from './AINotesPage'; // Reusing existing page as a component
import DataSyncSettings from '../components/settings/DataSyncSettings';
import GeneralSettings from '../components/settings/GeneralSettings';
import BudgetSettings from '../components/settings/BudgetSettings';

const SettingsPage = ({ user, userSettings, categories, aiMemories, abbreviations, wallets, payers, budgetSettings, budgetPortfolios, initialTab = 'general' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const tabs = [
        { id: 'general', label: 'Chung', icon: Settings },
        { id: 'budgets', label: 'Ngân quỹ', icon: Wallet },
        { id: 'wallets', label: 'Ví tiền', icon: Wallet },
        { id: 'categories', label: 'Danh mục', icon: FolderTree },
        { id: 'ai', label: 'Ví ngữ cảnh', icon: Brain },
        { id: 'sync', label: 'Dữ liệu', icon: Database },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Settings className="w-6 h-6 text-slate-500" />
                        Cài đặt
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tùy chỉnh sổ quỹ của bạn</p>
                </div>
                {user && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-300">ID: {user.uid}</span>
                        <div className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full mx-1"></div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${navigator.onLine ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                            <span className={`text-xs font-medium ${navigator.onLine ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {navigator.onLine ? "Online" : "Offline"}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                                isActive 
                                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800 shadow-md' 
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                {activeTab === 'general' && <GeneralSettings user={user} userSettings={userSettings} />}
                {activeTab === 'budgets' && <BudgetSettings user={user} budgetSettings={budgetSettings} budgetPortfolios={budgetPortfolios} categories={categories} />}
                {activeTab === 'wallets' && <WalletsSettings user={user} wallets={wallets} userSettings={userSettings} />}
                {activeTab === 'categories' && <CategoriesPage user={user} categories={categories} hideHeader={true} />}
                {activeTab === 'ai' && <AINotesPage user={user} aiMemories={aiMemories} abbreviations={abbreviations} categories={categories} hideHeader={true} />}
                {activeTab === 'sync' && <DataSyncSettings user={user} />}
            </div>
        </div>
    );
};

export default SettingsPage;
