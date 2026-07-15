require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');

// ==== CẤU HÌNH ====
const FIREBASE_UID = '636pr2WwWAc8Jy7WIUtoZwq6cxE3';
const APP_ID = 'my_installment_app';
const USER_PATH = `artifacts/${APP_ID}/users/${FIREBASE_UID}`;
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wjlbnalqmqkpqzvmidkc.supabase.co';

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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const toSnakeCase = (str) => {
    if (str === 'categoryId') return 'category_id';
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const mapToSnakeCase = (obj) => {
    if (Array.isArray(obj)) return obj.map(mapToSnakeCase);
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[toSnakeCase(key)] = obj[key];
        }
        return newObj;
    }
    return obj;
};

async function recover() {
    const supabaseUserId = 'c361d02e-0f85-4144-84f0-ad70db5eeae3';

    console.log("1. Khôi phục Categories từ Firebase...");
    const catRef = firestore.collection(`${USER_PATH}/categories`);
    const catSnap = await catRef.get();
    
    // Xóa các danh mục hiện tại (những cái rác mình vừa tạo)
    await supabase.from('categories').delete().eq('user_id', supabaseUserId);

    const categoriesToInsert = [];
    catSnap.forEach(doc => {
        categoriesToInsert.push(mapToSnakeCase({ id: doc.id, ...doc.data(), user_id: supabaseUserId }));
    });
    
    // Insert lại danh mục gốc
    if (categoriesToInsert.length > 0) {
        const { error } = await supabase.from('categories').upsert(categoriesToInsert);
        if (error) console.error("Error inserting categories:", error);
        else console.log(`  ✅ Đã khôi phục ${categoriesToInsert.length} danh mục nguyên bản!`);
    }

    console.log("2. Khôi phục category_id cho Transactions...");
    const txRef = firestore.collection(`${USER_PATH}/transactions`);
    const txSnap = await txRef.get();
    let updatedTxnCount = 0;
    
    // Do each update
    const txPromises = [];
    txSnap.forEach(doc => {
        const data = doc.data();
        if (data.categoryId) {
            txPromises.push(
                supabase.from('transactions')
                    .update({ category_id: data.categoryId })
                    .eq('id', doc.id)
                    .then(({ error }) => {
                        if (!error) updatedTxnCount++;
                    })
            );
        }
    });
    
    await Promise.all(txPromises);
    console.log(`  ✅ Đã map lại ${updatedTxnCount} transactions về đúng danh mục cũ!`);
}

recover().catch(console.error);
