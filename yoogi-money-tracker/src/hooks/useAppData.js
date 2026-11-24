import { useState, useEffect } from 'react';
import {
    seedDefaultCategories, ensureRequiredCategories, subscribeCategories, subscribeTransactions,
    subscribeAIMemory, subscribeWallets, subscribePayers, subscribeDebtors, subscribeDebts,
    subscribeRecurringTransactions, subscribeLenders, subscribeUserSettings, subscribeInstallments,
    subscribeAbbreviations, saveVersion, cleanupOldAutoVersions, subscribeBudgetSettings, subscribeBudgetPortfolios
} from '../utils/supabaseHelpers';
import {
    fetchDailyBudgetSettings,
    saveDailyBudgetSettings,
    subscribeDailyBudgetSettings,
    getDefaultDailyBudgetSettings
} from '../services/dailyBudgetService';
import { saveUserAppData, loadUserAppData } from '../services/offlineStorage';

export const useAppData = (user) => {
    const [installments, setInstallments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [aiMemories, setAiMemories] = useState([]);
    const [abbreviations, setAbbreviations] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [payers, setPayers] = useState([]);
    const [debtors, setDebtors] = useState([]);
    const [debts, setDebts] = useState([]);
    const [recurringTransactions, setRecurringTransactions] = useState([]);
    const [lenders, setLenders] = useState([]);
    const [budgetSettings, setBudgetSettings] = useState({ incomeCategoryIds: [] });
    const [budgetPortfolios, setBudgetPortfolios] = useState([]);
    const [userSettings, setUserSettings] = useState({ monthStartDay: 1 });
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [dailyBudgetSettings, setDailyBudgetSettings] = useState(getDefaultDailyBudgetSettings());
    const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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
            setDebts([]);
            setRecurringTransactions([]);
            setLenders([]);
            setBudgetSettings({ incomeCategoryIds: [] });
            setBudgetPortfolios([]);
            setUserSettings({ monthStartDay: 1 });
            setDailyBudgetSettings(getDefaultDailyBudgetSettings());
            setIsDataLoading(false);
            return;
        }

        setIsDataLoading(true);
        let isMounted = true;

        // Hydrate from offline cache immediately if available
        loadUserAppData(user.uid).then((cached) => {
            if (cached && isMounted) {
                if (cached.installments?.length) setInstallments(cached.installments);
                if (cached.transactions?.length) setTransactions(cached.transactions);
                if (cached.categories?.length) setCategories(cached.categories);
                if (cached.aiMemories?.length) setAiMemories(cached.aiMemories);
                if (cached.abbreviations?.length) setAbbreviations(cached.abbreviations);
                if (cached.wallets?.length) setWallets(cached.wallets);
                if (cached.payers?.length) setPayers(cached.payers);
                if (cached.debtors?.length) setDebtors(cached.debtors);
                if (cached.debts?.length) setDebts(cached.debts);
                if (cached.recurringTransactions?.length) setRecurringTransactions(cached.recurringTransactions);
                if (cached.lenders?.length) setLenders(cached.lenders);
                if (cached.budgetSettings) setBudgetSettings(cached.budgetSettings);
                if (cached.budgetPortfolios?.length) setBudgetPortfolios(cached.budgetPortfolios);
                if (cached.userSettings) setUserSettings(cached.userSettings);
                if (cached.dailyBudgetSettings) setDailyBudgetSettings(cached.dailyBudgetSettings);
                
                if (cached.wallets?.length || cached.transactions?.length) {
                    setIsDataLoading(false);
                }
            }
        });

        seedDefaultCategories(user.uid).then((seeded) => {
            if (!seeded) {
                return ensureRequiredCategories(user.uid);
            }
        }).then(() => {
            console.log('Categories check & migration complete');
        }).catch(err => {
            console.error('Error with categories:', err);
        });

        let loadFlags = { txns: false, wallets: false, settings: false };
        const checkDataLoaded = (key) => {
            if (!loadFlags[key]) {
                loadFlags[key] = true;
                if (loadFlags.txns && loadFlags.wallets && loadFlags.settings) {
                    setIsDataLoading(false);
                }
            }
        };

        const unsubInst = subscribeInstallments(user.uid, setInstallments);
        const unsubCats = subscribeCategories(user.uid, setCategories);
        const unsubTxns = subscribeTransactions(user.uid, (data) => {
            setTransactions(data);
            checkDataLoaded('txns');
        });
        const unsubMem = subscribeAIMemory(user.uid, setAiMemories);
        const unsubWallets = subscribeWallets(user.uid, (data) => {
            setWallets(data);
            checkDataLoaded('wallets');
        });
        const unsubPayers = subscribePayers(user.uid, setPayers);
        const unsubDebtors = subscribeDebtors(user.uid, setDebtors);
        const unsubDebts = subscribeDebts(user.uid, setDebts);
        const unsubRecurring = subscribeRecurringTransactions(user.uid, setRecurringTransactions);
        const unsubLenders = subscribeLenders(user.uid, setLenders);
        const unsubSettings = subscribeUserSettings(user.uid, (data) => {
            setUserSettings(data);
            checkDataLoaded('settings');
        });
        const unsubAbbreviations = subscribeAbbreviations(user.uid, setAbbreviations);
        const unsubBudgetSettings = subscribeBudgetSettings(user.uid, setBudgetSettings);
        const unsubBudgetPortfolios = subscribeBudgetPortfolios(user.uid, setBudgetPortfolios);

        fetchDailyBudgetSettings(user.uid).then(settings => {
            if (isMounted) setDailyBudgetSettings(settings);
        });
        const unsubscribeDailyBudget = subscribeDailyBudgetSettings(user.uid, (newSettings) => {
            if (isMounted) setDailyBudgetSettings(newSettings);
        });

        return () => {
            isMounted = false;
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
            unsubBudgetSettings();
            unsubBudgetPortfolios();
            unsubscribeDailyBudget();
        };
    }, [user?.uid]);

    // Auto Backup & Cleanup
    useEffect(() => {
        if (!user) return;
        cleanupOldAutoVersions(user.uid);

        let timeoutId;
        let actionMessages = [];
        const handleMutate = (e) => {
            if (e.detail === 'all') return;
            const action = typeof e.detail === 'string' ? null : e.detail?.action;
            if (action) actionMessages.push(action);

            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
                try {
                    let saveName = 'Tự động lưu';
                    if (actionMessages.length > 0) {
                        const uniqueActions = [...new Set(actionMessages)];
                        saveName = 'Tự động lưu: ' + uniqueActions.join(', ');
                        actionMessages = [];
                    }
                    await saveVersion(user.uid, saveName);
                    console.log('Auto-saved new version:', saveName);
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

    // Save snapshot to offline storage (debounced)
    useEffect(() => {
        if (!user?.uid) return;
        // Only persist if we have actual data loaded to avoid overwriting cache with empty arrays
        if (!transactions?.length && !wallets?.length && !categories?.length) return;

        const timer = setTimeout(() => {
            saveUserAppData(user.uid, {
                installments, transactions, categories, aiMemories, abbreviations,
                wallets, payers, debtors, debts, recurringTransactions, lenders,
                budgetSettings, budgetPortfolios, userSettings, dailyBudgetSettings
            });
        }, 2000);
        return () => clearTimeout(timer);
    }, [
        user?.uid, installments, transactions, categories, aiMemories, abbreviations,
        wallets, payers, debtors, debts, recurringTransactions, lenders,
        budgetSettings, budgetPortfolios, userSettings, dailyBudgetSettings
    ]);

    return {
        installments, transactions, categories, aiMemories, abbreviations,
        wallets, payers, debtors, debts,
        recurringTransactions,
        lenders,
        budgetSettings,
        budgetPortfolios,
        userSettings, isDataLoading,
        dailyBudgetSettings, setDailyBudgetSettings,
        isOffline
    };
};
