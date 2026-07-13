const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Cấu hình Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Không tìm thấy file serviceAccountKey.json. Vui lòng tải từ Firebase Console và đặt vào cùng thư mục với script này.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 2. Cấu hình Supabase (Dùng Service Role Key)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
// Thay YOUR_SUPABASE_SERVICE_ROLE_KEY bằng key lấy từ Supabase (Project Settings -> API -> service_role secret)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';

if (SUPABASE_SERVICE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
    console.error("❌ Vui lòng mở file migrateData.js và điền SUPABASE_SERVICE_ROLE_KEY vào dòng 19.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APP_ID = process.env.VITE_APP_ID || 'my_installment_app'; // Đổi thành ID cũ trên Firebase

async function migrateData() {
    console.log("🚀 Bắt đầu quá trình Migration...");

    // Lấy tất cả user từ Firebase Auth
    let allUsers = [];
    let nextPageToken;
    do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        allUsers = allUsers.concat(listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Tìm thấy ${allUsers.length} users trong hệ thống.`);

    const collectionsToMigrate = [
        'categories', 'wallets', 'payers', 'debtors', 'lenders',
        'debts', 'transactions', 'recurring_transactions',
        'abbreviations', 'ai_memory', 'installments'
    ];

    for (const user of allUsers) {
        const userId = user.uid;
        console.log(`\n===========================================`);
        console.log(`🔄 Đang migrate data cho user: ${user.email} (${userId})`);
        console.log(`===========================================`);

        // Đảm bảo user tồn tại trên bảng auth.users của Supabase 
        // (Supabase sẽ không cho thêm data nếu foreign key user_id không tồn tại)
        // Lưu ý: Nếu user đăng nhập bằng Google trên app, Supabase có thể đã tự tạo UUID.
        // Cách tốt nhất là bạn nên đăng nhập vào app bằng tài khoản Google ĐÓ ÍT NHẤT 1 LẦN 
        // bằng Supabase trước khi chạy script này, để lấy UUID của Supabase.
        
        // Vì Supabase UUID và Firebase UID (chuỗi ngẫu nhiên) KHÁC NHAU.
        // Ta cần tìm Supabase User tương ứng với Email này.
        const { data: supaUsers, error: listUserErr } = await supabase.auth.admin.listUsers();
        if (listUserErr) {
            console.error("Lỗi lấy danh sách user từ Supabase:", listUserErr);
            continue;
        }
        
        const matchedSupaUser = supaUsers.users.find(u => u.email === user.email);
        if (!matchedSupaUser) {
            console.warn(`⚠️ Bỏ qua user ${user.email} vì chưa đăng nhập vào Supabase lần nào.`);
            console.log("=> Hãy vào app, đăng nhập bằng tài khoản này qua Google, rồi chạy lại script.");
            continue;
        }

        const supaUserId = matchedSupaUser.id;

        // Bắt đầu migrate từng collection
        for (const collName of collectionsToMigrate) {
            console.log(`-> Đang đọc collection: ${collName}...`);
            const snapshot = await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection(collName).get();
            
            if (snapshot.empty) {
                continue;
            }

            const ALLOWED_COLUMNS = {
                settings: ['id', 'user_id', 'month_start_day', 'created_at', 'updated_at'],
                categories: ['id', 'user_id', 'name', 'icon', 'type', 'order', 'subcategories', 'created_at', 'updated_at'],
                wallets: ['id', 'user_id', 'name', 'icon', 'balance', 'created_at', 'updated_at'],
                payers: ['id', 'user_id', 'name', 'created_at', 'updated_at'],
                debtors: ['id', 'user_id', 'name', 'created_at', 'updated_at'],
                lenders: ['id', 'user_id', 'name', 'created_at', 'updated_at'],
                debts: ['id', 'user_id', 'type', 'amount', 'remaining_amount', 'interest_rate', 'date', 'due_date', 'note', 'person_id', 'person_name', 'status', 'wallet_id', 'installment_months', 'created_at', 'updated_at'],
                transactions: ['id', 'user_id', 'type', 'amount', 'date', 'category_id', 'subcategory_id', 'wallet_id', 'to_wallet_id', 'payer_id', 'installment_id', 'fee', 'note', 'is_recurring', 'ai_categorized', 'created_at', 'updated_at'],
                recurring_transactions: ['id', 'user_id', 'type', 'amount', 'category_id', 'subcategory_id', 'wallet_id', 'to_wallet_id', 'payer_id', 'frequency', 'start_date', 'end_date', 'last_processed', 'next_process', 'note', 'is_active', 'created_at', 'updated_at'],
                abbreviations: ['id', 'user_id', 'short', 'full_text', 'created_at', 'updated_at'],
                ai_memory: ['id', 'user_id', 'context', 'category_id', 'created_at', 'updated_at'],
                installments: ['id', 'user_id', 'name', 'original_amount', 'monthly_payment', 'total_payable', 'term', 'rate', 'start_date', 'owner', 'lender', 'paid_months', 'partial_payments', 'created_at', 'updated_at']
            };

            const dataToInsert = [];
            const uniqueIds = new Set();

            snapshot.forEach(doc => {
                const data = doc.data();
                const mappedData = {};

                const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

                // Map keys
                for (const [key, value] of Object.entries(data)) {
                    if (key === 'createdAt') mappedData['created_at'] = value ? new Date(value.toMillis ? value.toMillis() : value).toISOString() : new Date().toISOString();
                    else if (key === 'updatedAt') mappedData['updated_at'] = value ? new Date(value.toMillis ? value.toMillis() : value).toISOString() : new Date().toISOString();
                    else if (key === 'categoryId') mappedData['category_id'] = value;
                    else if (key === 'subcategoryId') mappedData['subcategory_id'] = value;
                    else if (key === 'walletId') mappedData['wallet_id'] = value;
                    else if (key === 'toWalletId' || key === 'transferTo') mappedData['to_wallet_id'] = value;
                    else if (key === 'payerId') mappedData['payer_id'] = value;
                    else if (key === 'installmentId') mappedData['installment_id'] = value;
                    else if (key === 'personId') mappedData['person_id'] = value;
                    else if (key === 'startDate') mappedData['start_date'] = value;
                    else if (key === 'endDate') mappedData['end_date'] = value;
                    else if (key === 'lastProcessed') mappedData['last_processed'] = value;
                    else if (key === 'nextProcess' || key === 'nextDate') mappedData['next_process'] = value; 
                    else if (key === 'isRecurring') mappedData['is_recurring'] = value;
                    else if (key === 'aiCategorized') mappedData['ai_categorized'] = value;
                    else if (key === 'dueDate') mappedData['due_date'] = value;
                    else if (key === 'isActive') mappedData['is_active'] = value;
                    else if (key === 'installmentMonths') mappedData['installment_months'] = value;
                    else if (key === 'interestRate') mappedData['interest_rate'] = value;
                    else if (key === 'monthStartDay') mappedData['month_start_day'] = value;
                    else if (key === 'notes' || key === 'description') mappedData['note'] = value; 
                    else if (key === 'longForm') mappedData['full_text'] = value; 
                    else if (key === 'shortForm') mappedData['short'] = value; 
                    else if (key === 'keyword' && collName === 'ai_memory') mappedData['context'] = value; 
                    else if (key === 'personName') mappedData['person_name'] = value;
                    else mappedData[toSnakeCase(key)] = value;
                }

                // Custom logic for debts amount / remaining_amount
                if (collName === 'debts') {
                    if (data.totalAmount !== undefined) mappedData['amount'] = data.totalAmount;
                    mappedData['remaining_amount'] = (data.totalAmount || 0) - (data.repaidAmount || 0);
                }

                // Debug first item of debts/abbreviations
                if ((collName === 'debts' || collName === 'abbreviations') && dataToInsert.length === 0) {
                    console.log(`[DEBUG] Example of ${collName}:`, data);
                }

                const finalObj = {
                    id: doc.id,
                    user_id: supaUserId,
                    ...mappedData
                };

                // Lọc theo ALLOWED_COLUMNS
                const filteredObj = {};
                if (ALLOWED_COLUMNS[collName]) {
                    for (const key of ALLOWED_COLUMNS[collName]) {
                        if (finalObj[key] !== undefined) {
                            filteredObj[key] = finalObj[key];
                        }
                    }
                } else {
                    Object.assign(filteredObj, finalObj);
                }
                
                // Add default for debts type
                if (collName === 'debts' && !filteredObj.type) {
                    filteredObj.type = 'debt';
                }

                if (!uniqueIds.has(filteredObj.id)) {
                    uniqueIds.add(filteredObj.id);
                    dataToInsert.push(filteredObj);
                }
            });

            const { error: insertErr } = await supabase.from(collName).upsert(dataToInsert);
            if (insertErr) {
                console.error(`❌ Lỗi khi insert ${collName}:`, insertErr.message);
            } else {
                console.log(`✅ Đã migrate ${dataToInsert.length} records vào ${collName}`);
            }
        }
        
        // Settings collection
        console.log(`-> Đang đọc collection: settings...`);
        const settingsSnap = await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('settings').doc('preferences').get();
        if (settingsSnap.exists) {
            const settingsData = settingsSnap.data();
            const mappedSettings = { user_id: supaUserId };
            for (const [k, v] of Object.entries(settingsData)) {
                if (k === 'monthStartDay') mappedSettings.month_start_day = v;
                else mappedSettings[k] = v;
            }
            const { error } = await supabase.from('settings').upsert([mappedSettings]);
            if (error) console.error("Lỗi khi migrate settings:", error.message);
            else console.log(`✅ Đã migrate settings`);
        }
    }

    console.log("\n🎉 MIGRATION HOÀN TẤT!");
}

migrateData().catch(console.error);
