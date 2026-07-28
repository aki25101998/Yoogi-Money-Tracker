import { useState, useEffect } from 'react';
import {
    seedDefaultCategories, ensureRequiredCategories, subscribeCategories, subscribeTransactions,
    subscribeAIMemory, subscribeWallets, subscribePayers, subscribeDebtors, subscribeDebts,
    subscribeRecurringTransactions, subscribeLenders, subscribeUserSettings, subscribeInstallments,
    subscribeAbbreviations, saveVersion, cleanupOldAutoVersions, subscribeBudgetRules
} from '../utils/supabaseHelpers';

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
    const [budgetRules, setBudgetRules] = useState([]);
    const [userSettings, setUserSettings] = useState({ monthStartDay: 1 });
    const [isDataLoading, setIsDataLoading] = useState(true);

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
            setBudgetRules([]);
            setUserSettings({ monthStartDay: 1 });
            setIsDataLoading(false);
            return;
        }

        setIsDataLoading(true);

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
        const unsubBudgetRules = subscribeBudgetRules(user.uid, setBudgetRules);

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
            unsubBudgetRules();
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

    return {
        installments, transactions, categories, aiMemories, abbreviations,
        wallets, payers, debtors, debts,
        recurringTransactions,
        lenders,
        budgetRules,
        userSettings, isDataLoading
    };
};
