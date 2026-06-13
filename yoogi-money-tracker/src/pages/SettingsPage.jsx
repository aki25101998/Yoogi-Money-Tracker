import React, { useState, useEffect } from 'react';
import { Settings, Wallet, Users, FolderTree, Brain } from 'lucide-react';

import WalletsSettings from '../components/settings/WalletsSettings';
import PayersSettings from '../components/settings/PayersSettings';
import CategoriesPage from './CategoriesPage'; // Reusing existing page as a component
import AINotesPage from './AINotesPage'; // Reusing existing page as a component

const SettingsPage = ({ user, categories, aiMemories, wallets, payers, initialTab = 'wallets' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const tabs = [
        { id: 'wallets', label: 'Ví tiền', icon: Wallet },
        { id: 'categories', label: 'Danh mục', icon: FolderTree },
        { id: 'ai', label: 'Ví ngữ cảnh', icon: Brain },
        { id: 'payers', label: 'Người trả', icon: Users },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Settings className="w-6 h-6 text-slate-500" />
                    Cài đặt
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tùy chỉnh sổ quỹ của bạn</p>
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
                {activeTab === 'wallets' && <WalletsSettings user={user} wallets={wallets} />}
                {activeTab === 'categories' && <CategoriesPage user={user} categories={categories} hideHeader={true} />}
                {activeTab === 'ai' && <AINotesPage user={user} aiMemories={aiMemories} categories={categories} hideHeader={true} />}
                {activeTab === 'payers' && <PayersSettings user={user} payers={payers} />}
            </div>
        </div>
    );
};

export default SettingsPage;
