import {
    collection, addDoc, deleteDoc, updateDoc, doc,
    onSnapshot, query, getDocs, setDoc, where, orderBy, writeBatch
} from 'firebase/firestore';
import { db, APP_ID } from '../config/firebase';
import { DEFAULT_CATEGORIES } from './defaultCategories';

// ============================================================
// PATH HELPERS
// ============================================================

const getUserPath = (userId) => `artifacts/${APP_ID}/users/${userId}`;

const getCollectionRef = (userId, collectionName) =>
    collection(db, getUserPath(userId), collectionName);

const getDocRef = (userId, collectionName, docId) =>
    doc(db, getUserPath(userId), collectionName, docId);

// ============================================================
// CATEGORIES
// ============================================================

/**
 * Seed default categories if the user has none
 */
export const seedDefaultCategories = async (userId) => {
    const catRef = getCollectionRef(userId, 'categories');
    const snapshot = await getDocs(catRef);

    if (snapshot.size > 0) return false; // Already seeded

    const batch = writeBatch(db);

    for (const cat of DEFAULT_CATEGORIES) {
        const docRef = doc(catRef, cat.id); // Use explicit ID to prevent race conditions
        batch.set(docRef, {
            ...cat,
            createdAt: new Date().toISOString(),
        });
    }

    await batch.commit();

    // Also seed a default wallet if wallets are empty
    const walletRef = getCollectionRef(userId, 'wallets');
    const walletSnapshot = await getDocs(walletRef);
    if (walletSnapshot.size === 0) {
        await addDoc(walletRef, {
            name: 'Tiền mặt',
            icon: '💵',
            isDefault: true,
            createdAt: new Date().toISOString(),
        });
    }

    // Also seed a default payer if payers are empty
    const payerRef = getCollectionRef(userId, 'payers');
    const payerSnapshot = await getDocs(payerRef);
    if (payerSnapshot.size === 0) {
        await addDoc(payerRef, {
            name: 'Tôi',
            createdAt: new Date().toISOString(),
        });
    }

    // Seed default settings
    const settingsRef = getDocRef(userId, 'settings', 'preferences');
    await setDoc(settingsRef, {
        monthStartDay: 1,
        createdAt: new Date().toISOString(),
    }, { merge: true });

    return true;
};

/**
 * Ensure required categories exist and migrate old ones
 */
export const ensureRequiredCategories = async (userId) => {
    const catRef = getCollectionRef(userId, 'categories');
    const snapshot = await getDocs(catRef);
    if (snapshot.size === 0) return; // handled by seedDefaultCategories

    const categories = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

    const hasUncategorizedExpense = categories.some(c => c.type === 'expense' && (c.id === 'uncategorized_expense' || c.name === 'Chưa phân loại' || c.name === '❓ Chưa phân loại'));
    const hasUncategorizedIncome = categories.some(c => c.type === 'income' && (c.id === 'uncategorized_income' || c.name === 'Chưa phân loại' || c.name === '❓ Chưa phân loại'));
    const existingTraNoTraGop = categories.find(c => c.id === 'tra_no_tra_gop');
    const batch = writeBatch(db);
    let updated = false;

    if (!existingTraNoTraGop || existingTraNoTraGop.type !== 'installment_repaid') {
        const cat = DEFAULT_CATEGORIES.find(c => c.id === 'tra_no_tra_gop');
        if (cat) {
            batch.set(doc(catRef, cat.id), {
                ...cat,
                createdAt: existingTraNoTraGop ? existingTraNoTraGop.createdAt : new Date().toISOString()
            });
            updated = true;
        }
    }

    // --- Cleanup phase: find and delete duplicates ---
    // If there are multiple uncategorized categories, keep the oldest one and delete the rest
    const cleanupDuplicates = (typeFilter, idFilter) => {
        const matches = categories.filter(c => c.type === typeFilter && (c.id === idFilter || c.name === 'Chưa phân loại' || c.name === '❓ Chưa phân loại'));
        if (matches.length > 1) {
            // Sort by createdAt ascending (fallback to docId)
            matches.sort((a, b) => (a.createdAt || a.docId).localeCompare(b.createdAt || b.docId));
            // Delete all except the first one
            for (let i = 1; i < matches.length; i++) {
                const docRef = getDocRef(userId, 'categories', matches[i].docId);
                batch.delete(docRef);
                updated = true;
            }
        }
    };
    cleanupDuplicates('expense', 'uncategorized_expense');
    cleanupDuplicates('income', 'uncategorized_income');

    // Check if we need to rename existing ones or clear their subcategories
    for (const cat of categories) {
        if (cat.id === 'uncategorized_expense' || cat.id === 'uncategorized_income' || cat.name === '❓ Chưa phân loại') {
            const docRef = getDocRef(userId, 'categories', cat.docId);
            let needsUpdate = false;
            let updates = {};

            if (cat.name === '❓ Chưa phân loại') {
                updates.name = 'Chưa phân loại';
                needsUpdate = true;
            }

            // Remove the subcategory 'chua_phan_loai' if it exists
            if (cat.subcategories && cat.subcategories.some(s => s.id === 'chua_phan_loai')) {
                updates.subcategories = cat.subcategories.filter(s => s.id !== 'chua_phan_loai');
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(docRef, updates);
                updated = true;
            }
        }
    }

    // Add missing ones if they were somehow deleted
    if (!hasUncategorizedExpense) {
        const docRef = doc(catRef, 'uncategorized_expense');
        batch.set(docRef, {
            id: 'uncategorized_expense',
            name: 'Chưa phân loại',
            icon: '❓',
            type: 'expense',
            order: 99,
            subcategories: [],
            createdAt: new Date().toISOString(),
        });
        updated = true;
    }

    if (!hasUncategorizedIncome) {
        const docRef = doc(catRef, 'uncategorized_income');
        batch.set(docRef, {
            id: 'uncategorized_income',
            name: 'Chưa phân loại',
            icon: '❓',
            type: 'income',
            order: 99,
            subcategories: [],
            createdAt: new Date().toISOString(),
        });
        updated = true;
    }

    if (!hasTransfer) {
        const docRef = doc(catRef, 'transfer');
        batch.set(docRef, {
            id: 'transfer',
            name: 'Chuyển tiền',
            icon: '💸',
            type: 'transfer',
            order: 1,
            subcategories: [],
            createdAt: new Date().toISOString(),
        });
        updated = true;
    }

    // Ensure loan categories exist
    const hasLoanGiven = categories.some(c => c.id === 'loan_given');
    const hasLoanRepaid = categories.some(c => c.id === 'loan_repaid');

    if (!hasLoanGiven) {
        const docRef = doc(catRef, 'loan_given');
        batch.set(docRef, {
            id: 'loan_given',
            name: 'Cho mượn',
            icon: '📤',
            type: 'loan_given',
            order: 1,
            subcategories: [],
            createdAt: new Date().toISOString(),
        });
        updated = true;
    }

    if (!hasLoanRepaid) {
        const docRef = doc(catRef, 'loan_repaid');
        batch.set(docRef, {
            id: 'loan_repaid',
            name: 'Nhận trả nợ',
            icon: '📥',
            type: 'loan_repaid',
            order: 2,
            subcategories: [],
            createdAt: new Date().toISOString(),
        });
        updated = true;
    }

    if (updated) {
        await batch.commit();
    }
};

/**
 * Listen to categories in real-time
 */
export const subscribeCategories = (userId, callback) => {
    const q = query(
        getCollectionRef(userId, 'categories'),
        orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }));
        callback(categories);
    });
};

/**
 * Add a new category
 */
export const addCategory = async (userId, categoryData) => {
    return await addDoc(getCollectionRef(userId, 'categories'), {
        ...categoryData,
        createdAt: new Date().toISOString(),
    });
};

/**
 * Update an existing category
 */
export const updateCategory = async (userId, categoryId, updates) => {
    const docRef = getDocRef(userId, 'categories', categoryId);
    return await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

/**
 * Update category order
 */
export const updateCategoryOrder = async (userId, orderedCategoryIds) => {
    const batch = writeBatch(db);
    orderedCategoryIds.forEach((id, index) => {
        const docRef = getDocRef(userId, 'categories', id);
        batch.update(docRef, { order: index, updatedAt: new Date().toISOString() });
    });
    await batch.commit();
};

/**
 * Delete a category
 */
export const deleteCategory = async (userId, categoryId) => {
    return await deleteDoc(getDocRef(userId, 'categories', categoryId));
};

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Listen to transactions in real-time
 */
export const subscribeTransactions = (userId, callback) => {
    const q = query(getCollectionRef(userId, 'transactions'));

    return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }));
        // Sort by date descending (newest first), then by time descending, then by createdAt
        transactions.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            // Same date? Sort by time (HH:mm) descending
            const timeA = a.time || '';
            const timeB = b.time || '';
            if (timeA && timeB) {
                const timeCompare = timeB.localeCompare(timeA);
                if (timeCompare !== 0) return timeCompare;
            } else if (timeB) return 1;
            else if (timeA) return -1;
            // Fallback: createdAt descending
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        callback(transactions);
    });
};

/**
 * Add a new transaction
 */
export const addTransaction = async (userId, transactionData) => {
    return await addDoc(getCollectionRef(userId, 'transactions'), {
        ...transactionData,
        createdAt: new Date().toISOString(),
    });
};

/**
 * Update a transaction
 */
export const updateTransaction = async (userId, transactionId, updates) => {
    const docRef = getDocRef(userId, 'transactions', transactionId);
    return await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (userId, transactionId) => {
    return await deleteDoc(getDocRef(userId, 'transactions', transactionId));
};

/**
 * Get transaction by debt ID
 */
export const getTransactionByDebtId = async (userId, debtId) => {
    const q = query(
        getCollectionRef(userId, 'transactions'),
        where('debtId', '==', debtId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
};

/**
 * Delete multiple transactions using batch
 */
export const deleteMultipleTransactions = async (userId, transactionIds) => {
    if (!transactionIds || transactionIds.length === 0) return;
    
    // Firestore batch has a limit of 500 operations.
    // Assuming we won't delete more than 500 at once for now.
    const batch = writeBatch(db);
    transactionIds.forEach(id => {
        const docRef = getDocRef(userId, 'transactions', id);
        batch.delete(docRef);
    });
    
    await batch.commit();
};

// ============================================================
// DEBTS (Sổ nợ)
// ============================================================

export const subscribeDebts = (userId, callback) => {
    const q = query(getCollectionRef(userId, 'debts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }));
        callback(items);
    });
};

export const addDebt = async (userId, data) => {
    return await addDoc(getCollectionRef(userId, 'debts'), {
        ...data,
        createdAt: new Date().toISOString(),
    });
};

export const updateDebt = async (userId, id, updates) => {
    const docRef = getDocRef(userId, 'debts', id);
    return await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

export const deleteDebt = async (userId, id) => {
    return await deleteDoc(getDocRef(userId, 'debts', id));
};

// ============================================================
// RECURRING TRANSACTIONS
// ============================================================

export const subscribeRecurringTransactions = (userId, callback) => {
    const q = query(getCollectionRef(userId, 'recurring_transactions'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }));
        callback(items);
    });
};

export const addRecurringTransaction = async (userId, data) => {
    return await addDoc(getCollectionRef(userId, 'recurring_transactions'), {
        ...data,
        createdAt: new Date().toISOString(),
    });
};

export const updateRecurringTransaction = async (userId, id, updates) => {
    const docRef = getDocRef(userId, 'recurring_transactions', id);
    return await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

export const deleteRecurringTransaction = async (userId, id) => {
    return await deleteDoc(getDocRef(userId, 'recurring_transactions', id));
};

// ============================================================
// AI MEMORY
// ============================================================

/**
 * Listen to AI memory rules in real-time
 */
export const subscribeAIMemory = (userId, callback) => {
    const q = query(getCollectionRef(userId, 'ai_memory'));

    return onSnapshot(q, (snapshot) => {
        const memories = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }));
        memories.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        callback(memories);
    });
};

/**
 * Get all AI memory rules (one-time fetch)
 */
export const getAIMemory = async (userId) => {
    const snapshot = await getDocs(getCollectionRef(userId, 'ai_memory'));
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
};

/**
 * Add a new AI memory rule
 */
export const addAIMemory = async (userId, memoryData) => {
    return await addDoc(getCollectionRef(userId, 'ai_memory'), {
        ...memoryData,
        usageCount: 0,
        createdAt: new Date().toISOString(),
    });
};

/**
 * Update an AI memory rule
 */
export const updateAIMemory = async (userId, memoryId, updates) => {
    const docRef = getDocRef(userId, 'ai_memory', memoryId);
    return await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

/**
 * Delete an AI memory rule
 */
export const deleteAIMemory = async (userId, memoryId) => {
    return await deleteDoc(getDocRef(userId, 'ai_memory', memoryId));
};

/**
 * Increment usage count for a memory rule
 */
export const incrementMemoryUsage = async (userId, memoryId) => {
    const docRef = getDocRef(userId, 'ai_memory', memoryId);
    const snapshot = await getDocs(query(getCollectionRef(userId, 'ai_memory')));
    const mem = snapshot.docs.find(d => d.id === memoryId);
    if (mem) {
        await updateDoc(docRef, {
            usageCount: (mem.data().usageCount || 0) + 1,
        });
    }
};

/**
 * Create or update AI memory from a user correction
 * When user re-categorizes a transaction, AI learns from it
 */
export const learnFromCorrection = async (userId, keyword, categoryId, subcategoryId) => {
    // Check if rule already exists for this keyword
    const memories = await getAIMemory(userId);
    const normalizedKeyword = keyword.toLowerCase().trim();

    const existing = memories.find(m =>
        m.keyword.toLowerCase().trim() === normalizedKeyword
    );

    if (existing) {
        // Update existing rule
        await updateAIMemory(userId, existing.id, {
            categoryId,
            subcategoryId,
            source: 'auto',
        });
    } else {
        // Create new rule
        await addAIMemory(userId, {
            keyword: normalizedKeyword,
            categoryId,
            subcategoryId,
            source: 'auto',
        });
    }
};

// ============================================================
// ABBREVIATIONS
// ============================================================

export const subscribeAbbreviations = (userId, callback) => {
    const q = query(getCollectionRef(userId, 'abbreviations'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }));
        callback(items);
    });
};

export const addAbbreviation = async (userId, data) => {
    return await addDoc(getCollectionRef(userId, 'abbreviations'), {
        ...data,
        createdAt: new Date().toISOString(),
    });
};

export const learnAbbreviationFromCorrection = async (userId, shortForm, longForm) => {
    if (!shortForm || !longForm || shortForm.trim() === longForm.trim()) return;
    
    const q = query(getCollectionRef(userId, 'abbreviations'));
    const snapshot = await getDocs(q);
    const abbreviations = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
    const normalizedShort = shortForm.toLowerCase().trim();
    const existing = abbreviations.find(a => a.shortForm.toLowerCase().trim() === normalizedShort);

    if (existing) {
        await updateAbbreviation(userId, existing.id, { longForm: longForm.trim() });
    } else {
        await addAbbreviation(userId, { shortForm: normalizedShort, longForm: longForm.trim() });
    }
};

export const processCorrections = async (userId, oldTxn, newTxn) => {
    if (!oldTxn || !newTxn) return;

    // Learn category correction
    if (newTxn.categoryId && (newTxn.categoryId !== oldTxn.categoryId || newTxn.subcategoryId !== oldTxn.subcategoryId)) {
        await learnFromCorrection(userId, oldTxn.originalInput || oldTxn.description, newTxn.categoryId, newTxn.subcategoryId || '');
    }

    // Learn abbreviation correction
    if (newTxn.description && oldTxn.description && newTxn.description.trim() !== oldTxn.description.trim()) {
        const newDesc = newTxn.description.trim();
        const oldDesc = oldTxn.description.trim();

        const q = query(getCollectionRef(userId, 'abbreviations'));
        const snapshot = await getDocs(q);
        const abbreviations = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        let targetShortForm = oldDesc;
        let updateExistingId = null;

        if (oldTxn.originalInput) {
            const originalLower = oldTxn.originalInput.toLowerCase();
            const matchedAbbr = abbreviations.find(abbr => 
                abbr.longForm.toLowerCase() === oldDesc.toLowerCase() && 
                new RegExp(`\\b${abbr.shortForm.toLowerCase()}\\b`, 'i').test(originalLower)
            );
            
            if (matchedAbbr) {
                targetShortForm = matchedAbbr.shortForm;
                updateExistingId = matchedAbbr.id;
            } else {
                // Try to extract keyword by removing price from original input
                let cleanedInput = oldTxn.originalInput.replace(/\b\d+([.,]\d+)?\s*(k|ngàn|nghìn|tr|triệu|đ|d|vnd|vnđ)?\b/gi, '');
                cleanedInput = cleanedInput.replace(/\s+/g, ' ').trim();
                
                if (cleanedInput && cleanedInput.length > 0) {
                    targetShortForm = cleanedInput;
                }
            }
        }

        if (updateExistingId) {
            await updateAbbreviation(userId, updateExistingId, { longForm: newDesc });
        } else if (targetShortForm.length <= 30) {
            const normalizedShort = targetShortForm.toLowerCase();
            const existing = abbreviations.find(a => a.shortForm.toLowerCase() === normalizedShort);
            if (existing) {
                await updateAbbreviation(userId, existing.id, { longForm: newDesc });
            } else {
                await addAbbreviation(userId, { shortForm: normalizedShort, longForm: newDesc });
            }
        }
    }
};

export const updateAbbreviation = async (userId, id, updates) => {
    const docRef = getDocRef(userId, 'abbreviations', id);
    return await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

export const deleteAbbreviation = async (userId, id) => {
    return await deleteDoc(getDocRef(userId, 'abbreviations', id));
};

// ============================================================
// INSTALLMENTS (Keep existing path structure)
// ============================================================

export const getInstallmentsRef = (userId) =>
    getCollectionRef(userId, 'installments');

export const getInstallmentDocRef = (userId, docId) =>
    getDocRef(userId, 'installments', docId);

// ============================================================
// WALLETS
// ============================================================

export const subscribeWallets = (userId, callback) => {
    const q = query(getCollectionRef(userId, 'wallets'));
    return onSnapshot(q, (snapshot) => {
        const wallets = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        }));
        // Sort by order ascending, fallback to createdAt or id
        wallets.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            if (a.order !== undefined) return -1;
            if (b.order !== undefined) return 1;
            return (a.createdAt || a.id).localeCompare(b.createdAt || b.id);
        });
        callback(wallets);
    });
};

export const addWallet = async (userId, walletData) => {
    return await addDoc(getCollectionRef(userId, 'wallets'), {
        ...walletData,
        createdAt: new Date().toISOString(),
    });
};

export const updateWallet = async (userId, walletId, updates) => {
    const docRef = getDocRef(userId, 'wallets', walletId);
    return await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

export const updateWalletOrder = async (userId, orderedWalletIds) => {
    const batch = writeBatch(db);
    orderedWalletIds.forEach((id, index) => {
        const docRef = getDocRef(userId, 'wallets', id);
        batch.update(docRef, { order: index, updatedAt: new Date().toISOString() });
    });
    await batch.commit();
};

export const deleteWallet = async (userId, walletId) => {
    return await deleteDoc(getDocRef(userId, 'wallets', walletId));
};

// ==============================
// USER SETTINGS
// ==============================

export const subscribeUserSettings = (userId, onUpdate) => {
    const docRef = getDocRef(userId, 'settings', 'preferences');
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onUpdate({ isPro: false, ...docSnap.data() });
        } else {
            onUpdate({ monthStartDay: 1, isPro: false }); // Default fallback
        }
    });
};

export const updateUserSettings = async (userId, settings) => {
    const docRef = getDocRef(userId, 'settings', 'preferences');
    return await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
};

// ==============================
// PAYERS (INSTALLMENTS)
// ==============================
export const subscribePayers = (userId, onUpdate) => {
    const colRef = getCollectionRef(userId, 'payers');
    const q = query(colRef, orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        onUpdate(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
};

export const addPayer = async (userId, payerData) => {
    return await addDoc(getCollectionRef(userId, 'payers'), {
        ...payerData,
        createdAt: new Date().toISOString()
    });
};

export const updatePayer = async (userId, payerId, payerData) => {
    return await updateDoc(getDocRef(userId, 'payers', payerId), payerData);
};

export const deletePayer = async (userId, payerId) => {
    return await deleteDoc(getDocRef(userId, 'payers', payerId));
};

// ==============================
// DEBTORS (DEBTS)
// ==============================
export const subscribeDebtors = (userId, onUpdate) => {
    const colRef = getCollectionRef(userId, 'debtors');
    const q = query(colRef, orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        onUpdate(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
};

export const addDebtor = async (userId, debtorData) => {
    return await addDoc(getCollectionRef(userId, 'debtors'), {
        ...debtorData,
        createdAt: new Date().toISOString()
    });
};

export const deleteDebtor = async (userId, debtorId) => {
    return await deleteDoc(getDocRef(userId, 'debtors', debtorId));
};

export const updateDebtor = async (userId, debtorId, debtorData) => {
    return await updateDoc(getDocRef(userId, 'debtors', debtorId), debtorData);
};

// ==============================
// LENDERS (INSTALLMENTS)
// ==============================
export const subscribeLenders = (userId, onUpdate) => {
    const colRef = getCollectionRef(userId, 'lenders');
    const q = query(colRef, orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        onUpdate(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
};

export const addLender = async (userId, lenderData) => {
    return await addDoc(getCollectionRef(userId, 'lenders'), {
        ...lenderData,
        createdAt: new Date().toISOString()
    });
};

export const deleteLender = async (userId, lenderId) => {
    return await deleteDoc(getDocRef(userId, 'lenders', lenderId));
};

export const updateLender = async (userId, lenderId, lenderData) => {
    return await updateDoc(getDocRef(userId, 'lenders', lenderId), lenderData);
};

// ==============================
// DATA EXPORT/IMPORT (SYNC)
// ==============================

export const exportUserData = async (userId) => {
    const collectionsToExport = [
        'categories', 'transactions', 'debts', 'recurring_transactions',
        'ai_memory', 'installments', 'wallets', 'payers', 'debtors', 'lenders', 'ai_chat_history', 'abbreviations'
    ];

    const data = {};

    for (const colName of collectionsToExport) {
        const snapshot = await getDocs(getCollectionRef(userId, colName));
        data[colName] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    }

    return data;
};

export const importUserData = async (userId, data) => {
    const validCollections = [
        'categories', 'transactions', 'debts', 'recurring_transactions',
        'ai_memory', 'installments', 'wallets', 'payers', 'debtors', 'lenders', 'ai_chat_history', 'abbreviations'
    ];

    let batch = writeBatch(db);
    let operationCount = 0;

    for (const [colName, docs] of Object.entries(data)) {
        if (!validCollections.includes(colName)) continue;

        for (const docData of docs) {
            const { id, ...rest } = docData;
            const docRef = id 
                ? getDocRef(userId, colName, id) 
                : doc(getCollectionRef(userId, colName));
            
            batch.set(docRef, rest);
            operationCount++;

            // Firestore batch has a limit of 500 operations
            if (operationCount >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
            }
        }
    }

    if (operationCount > 0) {
        await batch.commit();
    }
};

// ==============================
// AI CHAT HISTORY
// ==============================

export const subscribeAIChatHistory = (userId, walletId, onUpdate) => {
    const docRef = getDocRef(userId, 'ai_chat_history', walletId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data().messages || []);
        } else {
            onUpdate(null);
        }
    });
};

export const updateAIChatHistory = async (userId, walletId, messages) => {
    const docRef = getDocRef(userId, 'ai_chat_history', walletId);
    return await setDoc(docRef, { messages, updatedAt: new Date().toISOString() }, { merge: true });
};

export const clearAIChatHistory = async (userId, walletId) => {
    const docRef = getDocRef(userId, 'ai_chat_history', walletId);
    return await deleteDoc(docRef);
};
