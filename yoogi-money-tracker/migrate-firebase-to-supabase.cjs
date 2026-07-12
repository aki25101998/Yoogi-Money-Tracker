/**
 * Firebase → Supabase Data Migration Script
 * 
 * CÁCH DÙNG:
 * 1. Đặt file firebase-service-account.json vào thư mục gốc của project
 * 2. Chạy: node migrate-firebase-to-supabase.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');

// ==== CẤU HÌNH ====
const FIREBASE_UID = '636pr2WwWAc8Jy7WIUtoZwq6cxE3';
const APP_ID = 'my_installment_app';
const USER_PATH = `artifacts/${APP_ID}/users/${FIREBASE_UID}`;

// Supabase config (from supabase.js)
const SUPABASE_URL = 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4poO77v3akvwthWiLzFmpQ_AmpvQTj_';
const SUPABASE_ANON_KEY = 'sb_publishable_z4bj2rImApOsky0rBqWBYQ_uzap5bmF';

// ==== KHỞI TẠO ====
let serviceAccount;
try {
    serviceAccount = require('./yoogi-money-tracker-firebase-adminsdk-fbsvc-7ac66a0e13.json');
} catch (e) {
    console.error('❌ Không tìm thấy file service account!');
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const firestore = getFirestore();

// Dùng service_role key nếu có (bypass RLS), fallback anon key
const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, supabaseKey);

// ==== HELPER FUNCTIONS ====
function convertTimestamp(value) {
    if (!value) return null;
    // Firebase Timestamp object
    if (value._seconds !== undefined) {
        return new Date(value._seconds * 1000).toISOString();
    }
    // Firestore Timestamp with toDate method (admin SDK)
    if (value.toDate && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
    }
    // Already a string
    if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
}

async function readFirebaseCollection(collectionName) {
    const ref = firestore.collection(`${USER_PATH}/${collectionName}`);
    const snapshot = await ref.get();
    const docs = [];
    snapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
    });
    console.log(`  📖 Firebase: ${collectionName} → ${docs.length} documents`);
    return docs;
}

async function getSupabaseUserId() {
    // Tìm user trong Supabase auth
    // Cần dùng service_role key để truy vấn auth.users
    // Nếu không có, hỏi user nhập trực tiếp
    
    // Thử tìm trong bảng settings (nếu có)
    const { data } = await supabase.from('settings').select('user_id').limit(1);
    if (data && data.length > 0) {
        return data[0].user_id;
    }
    return null;
}

// ==== MIGRATION FUNCTIONS ====

async function migrateSettings(supabaseUserId) {
    console.log('\n📋 Migrating settings...');
    const settingsRef = firestore.doc(`${USER_PATH}/settings/preferences`);
    const doc = await settingsRef.get();
    
    if (doc.exists) {
        const data = doc.data();
        // Check if settings already exist
        const { data: existing } = await supabase.from('settings').select('id').eq('user_id', supabaseUserId);
        if (existing && existing.length > 0) {
            await supabase.from('settings').update({
                month_start_day: data.monthStartDay || 1,
            }).eq('user_id', supabaseUserId);
        } else {
            await supabase.from('settings').insert([{
                user_id: supabaseUserId,
                month_start_day: data.monthStartDay || 1,
            }]);
        }
        console.log('  ✅ Settings migrated');
    } else {
        console.log('  ⚠️ No settings found in Firebase');
    }
}

async function migrateCategories(supabaseUserId) {
    console.log('\n📂 Migrating categories...');
    const docs = await readFirebaseCollection('categories');
    if (docs.length === 0) return {};
    
    const idMap = {}; // firebase_id → supabase_id
    
    // Delete existing categories first
    await supabase.from('categories').delete().eq('user_id', supabaseUserId);
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            name: doc.name,
            icon: doc.icon || null,
            type: doc.type,
            order: doc.order !== undefined ? doc.order : null,
            subcategories: doc.subcategories || [],
        };
        
        const { data, error } = await supabase.from('categories').insert([row]).select().single();
        if (error) {
            console.error(`  ❌ Error inserting category "${doc.name}":`, error.message);
        } else {
            idMap[doc.id] = data.id;
            // Also store fb_id mapping
        }
    }
    
    console.log(`  ✅ ${Object.keys(idMap).length}/${docs.length} categories migrated`);
    return idMap;
}

async function migrateWallets(supabaseUserId) {
    console.log('\n💰 Migrating wallets...');
    const docs = await readFirebaseCollection('wallets');
    if (docs.length === 0) return {};
    
    const idMap = {};
    
    // Delete existing wallets first
    // Must delete transactions first due to FK constraints
    await supabase.from('transactions').delete().eq('user_id', supabaseUserId);
    await supabase.from('recurring_transactions').delete().eq('user_id', supabaseUserId);
    await supabase.from('wallets').delete().eq('user_id', supabaseUserId);
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            name: doc.name,
            icon: doc.icon || null,
            balance: doc.balance || 0,
            initial_balance: doc.initialBalance || 0,
            is_default: doc.isDefault || false,
            order: doc.order !== undefined ? doc.order : 0,
        };
        
        const { data, error } = await supabase.from('wallets').insert([row]).select().single();
        if (error) {
            console.error(`  ❌ Error inserting wallet "${doc.name}":`, error.message);
        } else {
            idMap[doc.id] = data.id;
        }
    }
    
    console.log(`  ✅ ${Object.keys(idMap).length}/${docs.length} wallets migrated`);
    return idMap;
}

async function migratePayers(supabaseUserId) {
    console.log('\n👤 Migrating payers...');
    const docs = await readFirebaseCollection('payers');
    if (docs.length === 0) return {};
    
    const idMap = {};
    await supabase.from('payers').delete().eq('user_id', supabaseUserId);
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            name: doc.name,
        };
        
        const { data, error } = await supabase.from('payers').insert([row]).select().single();
        if (error) {
            console.error(`  ❌ Error inserting payer "${doc.name}":`, error.message);
        } else {
            idMap[doc.id] = data.id;
        }
    }
    
    console.log(`  ✅ ${Object.keys(idMap).length}/${docs.length} payers migrated`);
    return idMap;
}

async function migrateDebtors(supabaseUserId) {
    console.log('\n🧑 Migrating debtors...');
    const docs = await readFirebaseCollection('debtors');
    if (docs.length === 0) return {};
    
    const idMap = {};
    await supabase.from('debtors').delete().eq('user_id', supabaseUserId);
    
    for (const doc of docs) {
        const { data, error } = await supabase.from('debtors').insert([{
            user_id: supabaseUserId,
            name: doc.name,
        }]).select().single();
        if (error) {
            console.error(`  ❌ Error inserting debtor "${doc.name}":`, error.message);
        } else {
            idMap[doc.id] = data.id;
        }
    }
    
    console.log(`  ✅ ${Object.keys(idMap).length}/${docs.length} debtors migrated`);
    return idMap;
}

async function migrateLenders(supabaseUserId) {
    console.log('\n🏦 Migrating lenders...');
    const docs = await readFirebaseCollection('lenders');
    if (docs.length === 0) return {};
    
    const idMap = {};
    await supabase.from('lenders').delete().eq('user_id', supabaseUserId);
    
    for (const doc of docs) {
        const { data, error } = await supabase.from('lenders').insert([{
            user_id: supabaseUserId,
            name: doc.name,
        }]).select().single();
        if (error) {
            console.error(`  ❌ Error inserting lender "${doc.name}":`, error.message);
        } else {
            idMap[doc.id] = data.id;
        }
    }
    
    console.log(`  ✅ ${Object.keys(idMap).length}/${docs.length} lenders migrated`);
    return idMap;
}

async function migrateInstallments(supabaseUserId) {
    console.log('\n📅 Migrating installments...');
    const docs = await readFirebaseCollection('installments');
    if (docs.length === 0) return {};
    
    const idMap = {};
    await supabase.from('installments').delete().eq('user_id', supabaseUserId);
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            name: doc.name || 'Unnamed',
            original_amount: doc.originalAmount || doc.original_amount || 0,
            monthly_payment: doc.monthlyPayment || doc.monthly_payment || 0,
            total_payable: doc.totalPayable || doc.total_payable || 0,
            term: doc.term || 0,
            rate: doc.rate || 0,
            start_date: doc.startDate || doc.start_date || new Date().toISOString().slice(0, 10),
            owner: doc.owner || null,
            lender: doc.lender || null,
            paid_months: doc.paidMonths || doc.paid_months || [],
            partial_payments: doc.partialPayments || doc.partial_payments || {},
        };
        
        const { data, error } = await supabase.from('installments').insert([row]).select().single();
        if (error) {
            console.error(`  ❌ Error inserting installment "${doc.name}":`, error.message);
        } else {
            idMap[doc.id] = data.id;
        }
    }
    
    console.log(`  ✅ ${Object.keys(idMap).length}/${docs.length} installments migrated`);
    return idMap;
}

async function migrateDebts(supabaseUserId, walletIdMap, debtorIdMap, lenderIdMap) {
    console.log('\n💸 Migrating debts...');
    const docs = await readFirebaseCollection('debts');
    if (docs.length === 0) return {};
    
    const idMap = {};
    await supabase.from('debts').delete().eq('user_id', supabaseUserId);
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            type: doc.type || 'loan',
            amount: doc.amount || doc.totalAmount || 0,
            remaining_amount: doc.remainingAmount || doc.remaining_amount || doc.amount || 0,
            interest_rate: doc.interestRate || doc.interest_rate || 0,
            date: convertTimestamp(doc.date) || new Date().toISOString(),
            due_date: convertTimestamp(doc.dueDate || doc.due_date) || null,
            note: doc.note || doc.notes || null,
            person_id: doc.personId ? (debtorIdMap[doc.personId] || lenderIdMap[doc.personId] || doc.personId) : null,
            person_name: doc.personName || doc.person_name || null,
            status: doc.status || 'active',
            wallet_id: doc.walletId ? (walletIdMap[doc.walletId] || null) : null,
            installment_months: doc.installmentMonths || doc.installment_months || null,
        };
        
        const { data, error } = await supabase.from('debts').insert([row]).select().single();
        if (error) {
            console.error(`  ❌ Error inserting debt:`, error.message);
        } else {
            idMap[doc.id] = data.id;
        }
    }
    
    console.log(`  ✅ ${Object.keys(idMap).length}/${docs.length} debts migrated`);
    return idMap;
}

async function migrateTransactions(supabaseUserId, categoryIdMap, walletIdMap, payerIdMap, installmentIdMap, debtIdMap) {
    console.log('\n🧾 Migrating transactions...');
    const docs = await readFirebaseCollection('transactions');
    if (docs.length === 0) return;
    
    // Already deleted transactions when migrating wallets
    let success = 0;
    let failed = 0;
    
    // Insert in batches of 50
    const batches = [];
    for (let i = 0; i < docs.length; i += 50) {
        batches.push(docs.slice(i, i + 50));
    }
    
    for (const batch of batches) {
        const rows = batch.map(doc => ({
            user_id: supabaseUserId,
            type: doc.type || 'expense',
            amount: doc.amount || 0,
            date: convertTimestamp(doc.date) || new Date().toISOString(),
            category_id: doc.categoryId ? (categoryIdMap[doc.categoryId] || null) : null,
            subcategory_id: doc.subcategoryId || null,
            wallet_id: doc.walletId ? (walletIdMap[doc.walletId] || null) : null,
            to_wallet_id: doc.toWalletId ? (walletIdMap[doc.toWalletId] || null) : null,
            payer_id: doc.payerId ? (payerIdMap[doc.payerId] || null) : null,
            installment_id: doc.debtId ? (installmentIdMap[doc.debtId] || debtIdMap[doc.debtId] || null) : null,
            fee: doc.fee || 0,
            note: doc.note || doc.description || null,
            is_recurring: doc.isRecurring || false,
            ai_categorized: doc.aiCategorized || false,
        }));
        
        const { error } = await supabase.from('transactions').insert(rows);
        if (error) {
            console.error(`  ❌ Batch error:`, error.message);
            // Try inserting one by one
            for (const row of rows) {
                const { error: singleErr } = await supabase.from('transactions').insert([row]);
                if (singleErr) {
                    failed++;
                    console.error(`    ❌ Single error for transaction:`, singleErr.message);
                } else {
                    success++;
                }
            }
        } else {
            success += batch.length;
        }
    }
    
    console.log(`  ✅ ${success}/${docs.length} transactions migrated (${failed} failed)`);
}

async function migrateRecurringTransactions(supabaseUserId, categoryIdMap, walletIdMap) {
    console.log('\n🔄 Migrating recurring transactions...');
    const docs = await readFirebaseCollection('recurring_transactions');
    if (docs.length === 0) return;
    
    let success = 0;
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            type: doc.type || 'expense',
            amount: doc.amount || 0,
            category_id: doc.categoryId ? (categoryIdMap[doc.categoryId] || null) : null,
            subcategory_id: doc.subcategoryId || null,
            wallet_id: doc.walletId ? (walletIdMap[doc.walletId] || null) : null,
            note: doc.note || doc.description || null,
            frequency: doc.frequency || 'monthly',
            next_date: convertTimestamp(doc.nextDate || doc.next_date) || new Date().toISOString(),
            status: doc.status || 'active',
        };
        
        const { error } = await supabase.from('recurring_transactions').insert([row]);
        if (error) {
            console.error(`  ❌ Error:`, error.message);
        } else {
            success++;
        }
    }
    
    console.log(`  ✅ ${success}/${docs.length} recurring transactions migrated`);
}

async function migrateAIMemory(supabaseUserId, categoryIdMap) {
    console.log('\n🧠 Migrating AI memory...');
    const docs = await readFirebaseCollection('ai_memory');
    if (docs.length === 0) return;
    
    await supabase.from('ai_memory').delete().eq('user_id', supabaseUserId);
    let success = 0;
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            context: doc.keyword || doc.context || doc.name || '',
            category_id: doc.categoryId ? (categoryIdMap[doc.categoryId] || null) : null,
        };
        
        const { error } = await supabase.from('ai_memory').insert([row]);
        if (error) {
            console.error(`  ❌ Error:`, error.message);
        } else {
            success++;
        }
    }
    
    console.log(`  ✅ ${success}/${docs.length} AI memories migrated`);
}

async function migrateAbbreviations(supabaseUserId) {
    console.log('\n📝 Migrating abbreviations...');
    const docs = await readFirebaseCollection('abbreviations');
    if (docs.length === 0) return;
    
    await supabase.from('abbreviations').delete().eq('user_id', supabaseUserId);
    let success = 0;
    
    for (const doc of docs) {
        const row = {
            user_id: supabaseUserId,
            short: doc.shortForm || doc.short || '',
            full_text: doc.longForm || doc.full_text || doc.fullText || '',
        };
        
        if (!row.short || !row.full_text) {
            console.log(`  ⚠️ Skipping empty abbreviation`);
            continue;
        }
        
        const { error } = await supabase.from('abbreviations').insert([row]);
        if (error) {
            console.error(`  ❌ Error:`, error.message);
        } else {
            success++;
        }
    }
    
    console.log(`  ✅ ${success}/${docs.length} abbreviations migrated`);
}

// ==== MAIN ====
async function main() {
    console.log('🚀 BẮT ĐẦU MIGRATE DỮ LIỆU TỪ FIREBASE → SUPABASE');
    console.log('================================================');
    console.log(`Firebase UID: ${FIREBASE_UID}`);
    console.log(`Firebase Path: ${USER_PATH}`);
    console.log('');
    
    // Bước 1: Xác định Supabase User ID
    console.log('🔍 Đang tìm Supabase User ID...');
    
    const supabaseUserId = 'c361d02e-0f85-4144-84f0-ad70db5eeae3';
    
    console.log(`\n✅ Supabase User ID: ${supabaseUserId}`);
    console.log('\n================================================');
    console.log('⏳ Bắt đầu đọc dữ liệu từ Firebase...');
    
    try {
        // Migrate theo thứ tự (parent trước, child sau)
        await migrateSettings(supabaseUserId);
        
        const categoryIdMap = await migrateCategories(supabaseUserId);
        const walletIdMap = await migrateWallets(supabaseUserId);
        const payerIdMap = await migratePayers(supabaseUserId);
        const debtorIdMap = await migrateDebtors(supabaseUserId);
        const lenderIdMap = await migrateLenders(supabaseUserId);
        const installmentIdMap = await migrateInstallments(supabaseUserId);
        
        const debtIdMap = await migrateDebts(supabaseUserId, walletIdMap, debtorIdMap, lenderIdMap);
        await migrateTransactions(supabaseUserId, categoryIdMap, walletIdMap, payerIdMap, installmentIdMap, debtIdMap);
        await migrateRecurringTransactions(supabaseUserId, categoryIdMap, walletIdMap);
        await migrateAIMemory(supabaseUserId, categoryIdMap);
        await migrateAbbreviations(supabaseUserId);
        
        console.log('\n================================================');
        console.log('🎉 MIGRATE HOÀN TẤT!');
        console.log('   Hãy tải lại trang web để xem dữ liệu.');
        console.log('================================================');
        
        // In bản đồ ID để debug nếu cần
        console.log('\n📋 ID Mapping Summary:');
        console.log(`   Categories: ${Object.keys(categoryIdMap).length} mapped`);
        console.log(`   Wallets: ${Object.keys(walletIdMap).length} mapped`);
        console.log(`   Payers: ${Object.keys(payerIdMap).length} mapped`);
        console.log(`   Debtors: ${Object.keys(debtorIdMap).length} mapped`);
        console.log(`   Lenders: ${Object.keys(lenderIdMap).length} mapped`);
        console.log(`   Installments: ${Object.keys(installmentIdMap).length} mapped`);
        
    } catch (error) {
        console.error('\n❌ LỖI NGHIÊM TRỌNG:', error);
    }
    
    
    process.exit(0);
}

main();
