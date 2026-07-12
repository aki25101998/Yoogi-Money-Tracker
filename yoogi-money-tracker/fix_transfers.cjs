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

function convertTimestamp(fbDate) {
    if (!fbDate) return null;
    if (typeof fbDate === 'string') return new Date(fbDate).toISOString();
    if (fbDate.toDate) return fbDate.toDate().toISOString();
    if (fbDate._seconds) return new Date(fbDate._seconds * 1000).toISOString();
    return null;
}

async function fixTransfers() {
    console.log('🔄 Bắt đầu sửa các giao dịch chuyển tiền bị lỗi...');
    
    // 1. Lấy dữ liệu Supabase
    const { data: sbWallets } = await supabase.from('wallets').select('id, name').eq('user_id', SUPABASE_UID);
    const sbWalletMap = {};
    (sbWallets || []).forEach(w => sbWalletMap[w.name] = w.id);
    
    // 2. Lấy mapping ví từ Firebase -> Supabase
    const fbWalletsSnapshot = await firestore.collection(`${USER_PATH}/wallets`).get();
    const fbWalletToSbId = {};
    fbWalletsSnapshot.forEach(doc => {
        const data = doc.data();
        if (sbWalletMap[data.name]) {
            fbWalletToSbId[doc.id] = sbWalletMap[data.name];
        }
    });

    // 3. Lấy tất cả transfer transactions trên Supabase
    const { data: sbTransfers } = await supabase.from('transactions').select('*').eq('type', 'transfer').eq('user_id', SUPABASE_UID);
    
    // 4. Lấy tất cả transfer transactions trên Firebase
    const fbTxnsSnapshot = await firestore.collection(`${USER_PATH}/transactions`).where('type', '==', 'transfer').get();
    const fbTransfers = [];
    fbTxnsSnapshot.forEach(doc => fbTransfers.push(doc.data()));

    let fixedCount = 0;

    for (const sbTxn of sbTransfers || []) {
        if (sbTxn.to_wallet_id === null) {
            // Cần tìm transaction tương ứng trên Firebase để lấy transferTo
            // Match based on amount, date (ignore time), and note
            const sbDate = sbTxn.date ? sbTxn.date.slice(0, 10) : '';
            const sbNote = (sbTxn.note || '').trim().toLowerCase();
            
            const matchedFb = fbTransfers.find(fb => {
                const fbDateObj = convertTimestamp(fb.date);
                const fbDateStr = fbDateObj ? fbDateObj.slice(0, 10) : '';
                const fbNote = (fb.note || fb.description || '').trim().toLowerCase();
                
                return fb.amount === sbTxn.amount && fbDateStr === sbDate && fbNote === sbNote;
            });

            if (matchedFb && matchedFb.transferTo) {
                const targetSbWalletId = fbWalletToSbId[matchedFb.transferTo];
                if (targetSbWalletId) {
                    const { error } = await supabase.from('transactions').update({
                        to_wallet_id: targetSbWalletId,
                        category_id: 'transfer'
                    }).eq('id', sbTxn.id);
                    
                    if (!error) {
                        fixedCount++;
                        console.log(`Đã sửa giao dịch: ${sbTxn.amount} (${sbTxn.note}) -> to_wallet_id: ${targetSbWalletId}`);
                    }
                }
            }
        }
    }
    
    console.log(`✅ Đã sửa thành công ${fixedCount} giao dịch chuyển tiền bị lỗi.`);
    
    // Also delete the test transaction I created
    await supabase.from('transactions').delete().eq('note', 'Test insert transfer');
    console.log('✅ Đã dọn dẹp giao dịch test.');
}

fixTransfers().catch(console.error);
