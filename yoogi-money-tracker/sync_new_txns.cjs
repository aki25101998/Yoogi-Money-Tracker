const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');

// Config
const FIREBASE_UID = '636pr2WwWAc8Jy7WIUtoZwq6cxE3';
const SUPABASE_UID = 'c361d02e-0f85-4144-84f0-ad70db5eeae3';
const APP_ID = 'my_installment_app';
const USER_PATH = `artifacts/${APP_ID}/users/${FIREBASE_UID}`;

const SUPABASE_URL = 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4poO77v3akvwthWiLzFmpQ_AmpvQTj_';

let serviceAccount;
try {
    serviceAccount = require('./yoogi-money-tracker-firebase-adminsdk-fbsvc-7ac66a0e13.json');
} catch (e) {
    console.error('❌ Service account missing!');
    process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function convertTimestamp(value) {
    if (!value) return null;
    if (value._seconds !== undefined) return new Date(value._seconds * 1000).toISOString();
    if (value.toDate && typeof value.toDate === 'function') return value.toDate().toISOString();
    return new Date(value).toISOString();
}

async function runSync() {
    console.log('🔄 Bắt đầu đồng bộ...');
    
    // 1. Lấy dữ liệu Supabase
    const { data: sbWallets, error: wErr } = await supabase.from('wallets').select('id, name').eq('user_id', SUPABASE_UID);
    if (wErr) console.error('Wallet error:', wErr);
    
    const { data: sbCategories, error: cErr } = await supabase.from('categories').select('id, name').eq('user_id', SUPABASE_UID);
    if (cErr) console.error('Category error:', cErr);
    
    const { data: sbTxns, error: tErr } = await supabase.from('transactions').select('amount, date, note').eq('user_id', SUPABASE_UID);
    if (tErr) console.error('Txn error:', tErr);
    
    const sbWalletMap = {};
    (sbWallets || []).forEach(w => sbWalletMap[w.name] = w.id);
    
    const sbCatMap = {};
    (sbCategories || []).forEach(c => sbCatMap[c.name] = c.id);
    
    const sbTxnSet = new Set();
    (sbTxns || []).forEach(t => {
        const d = t.date ? t.date.slice(0, 10) : '';
        const note = (t.note || '').trim().toLowerCase();
        sbTxnSet.add(`${t.amount}_${d}_${note}`);
    });

    // 2. Lấy dữ liệu Firebase
    const fbWalletsSnapshot = await firestore.collection(`${USER_PATH}/wallets`).get();
    const fbWalletToSbId = {};
    fbWalletsSnapshot.forEach(doc => {
        const data = doc.data();
        if (sbWalletMap[data.name]) {
            fbWalletToSbId[doc.id] = sbWalletMap[data.name];
        }
    });

    const fbCatsSnapshot = await firestore.collection(`${USER_PATH}/categories`).get();
    const fbCatToSbId = {};
    fbCatsSnapshot.forEach(doc => {
        const data = doc.data();
        if (sbCatMap[data.name]) {
            fbCatToSbId[doc.id] = sbCatMap[data.name];
        }
    });

    const fbTxnsSnapshot = await firestore.collection(`${USER_PATH}/transactions`).get();
    let newCount = 0;
    
    const batch = [];
    fbTxnsSnapshot.forEach(doc => {
        const t = doc.data();
        const d = convertTimestamp(t.date);
        const dStr = d ? d.slice(0, 10) : '';
        const note = (t.note || t.description || '').trim().toLowerCase();
        const sig = `${t.amount || 0}_${dStr}_${note}`;
        
        if (!sbTxnSet.has(sig)) {
            // Đây là giao dịch mới
            batch.push({
                user_id: SUPABASE_UID,
                type: t.type || 'expense',
                amount: t.amount || 0,
                date: d || new Date().toISOString(),
                category_id: t.categoryId ? (fbCatToSbId[t.categoryId] || null) : null,
                wallet_id: t.walletId ? (fbWalletToSbId[t.walletId] || null) : null,
                to_wallet_id: t.transferTo ? (fbWalletToSbId[t.transferTo] || null) : null,
                note: t.note || t.description || null,
            });
        }
    });

    if (batch.length > 0) {
        console.log(`Tiến hành thêm ${batch.length} giao dịch mới...`);
        // Chèn từng batch 50 cái
        for (let i = 0; i < batch.length; i += 50) {
            const chunk = batch.slice(i, i + 50);
            const { error } = await supabase.from('transactions').insert(chunk);
            if (error) console.error('Lỗi khi chèn dữ liệu:', error);
            else newCount += chunk.length;
        }
    } else {
        console.log('Không tìm thấy giao dịch mới nào trên Firebase!');
    }

    console.log(`✅ Đã đồng bộ thành công ${newCount} giao dịch.`);
    process.exit(0);
}

runSync().catch(console.error);
