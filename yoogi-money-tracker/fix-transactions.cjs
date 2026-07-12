const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');

const serviceAccount = require('./yoogi-money-tracker-firebase-adminsdk-fbsvc-7ac66a0e13.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const supabase = createClient('https://wjlbnalqmqkpqzvmidkc.supabase.co', 'sb_secret_4poO77v3akvwthWiLzFmpQ_AmpvQTj_');

const USER_PATH = 'artifacts/my_installment_app/users/636pr2WwWAc8Jy7WIUtoZwq6cxE3';
const supabaseUserId = 'c361d02e-0f85-4144-84f0-ad70db5eeae3';

async function run() {
    // Cache categories and wallets from Supabase
    const { data: sbCategories } = await supabase.from('categories').select('*').eq('user_id', supabaseUserId);
    const { data: sbWallets } = await supabase.from('wallets').select('*').eq('user_id', supabaseUserId);
    
    // Cache categories from Firebase
    const fbCategoriesSnap = await db.collection(USER_PATH + '/categories').get();
    const fbCategories = {};
    fbCategoriesSnap.forEach(doc => { fbCategories[doc.id] = doc.data(); });
    
    // Cache wallets from Firebase
    const fbWalletsSnap = await db.collection(USER_PATH + '/wallets').get();
    const fbWallets = {};
    fbWalletsSnap.forEach(doc => { fbWallets[doc.id] = doc.data(); });
    
    const snap = await db.collection(USER_PATH + '/transactions').get();
    console.log('Found ' + snap.size + ' transactions in Firebase');
    
    let updatedCats = 0;
    let updatedTransfers = 0;
    
    for (const docSnap of snap.docs) {
        const doc = docSnap.data();
        const note = doc.note || doc.description || '';
        const amount = doc.amount || 0;
        
        let updates = {};
        
        // Fix category mapping
        if (doc.categoryId) {
            let targetSbCat = null;
            
            if (['expense', 'income', 'transfer', 'loan', 'loan_given', 'loan_repaid'].includes(doc.categoryId)) {
                targetSbCat = sbCategories.find(c => c.type === doc.categoryId);
            } else if (fbCategories[doc.categoryId]) {
                const catName = fbCategories[doc.categoryId].name;
                targetSbCat = sbCategories.find(c => c.name === catName);
            }
            
            if (targetSbCat) {
                updates.category_id = targetSbCat.id;
            }
        }
        
        // Fix to_wallet_id mapping
        if (doc.type === 'transfer' && doc.transferTo) {
            const fbWallet = fbWallets[doc.transferTo];
            if (fbWallet) {
                const targetSbWallet = sbWallets.find(w => w.name === fbWallet.name);
                if (targetSbWallet) {
                    updates.to_wallet_id = targetSbWallet.id;
                }
            }
        }
        
        if (Object.keys(updates).length > 0) {
            // Find in Supabase
            let query = supabase.from('transactions').select('id, category_id, to_wallet_id').eq('user_id', supabaseUserId).eq('amount', amount);
            if (note) query = query.eq('note', note);
            else query = query.is('note', null);
            
            const { data } = await query.limit(1);
            if (data && data.length > 0) {
                const sbTx = data[0];
                let needsUpdate = false;
                let finalUpdates = {};
                
                if (updates.category_id && sbTx.category_id !== updates.category_id) {
                    needsUpdate = true;
                    finalUpdates.category_id = updates.category_id;
                }
                
                if (updates.to_wallet_id && sbTx.to_wallet_id !== updates.to_wallet_id) {
                    needsUpdate = true;
                    finalUpdates.to_wallet_id = updates.to_wallet_id;
                }
                
                if (needsUpdate) {
                    await supabase.from('transactions').update(finalUpdates).eq('id', sbTx.id);
                    if (finalUpdates.category_id) updatedCats++;
                    if (finalUpdates.to_wallet_id) updatedTransfers++;
                    console.log(`Updated Tx [${note}] - Cats: ${!!finalUpdates.category_id}, Transfer: ${!!finalUpdates.to_wallet_id}`);
                }
            }
        }
    }
    
    console.log(`Done. Updated ${updatedCats} categories and ${updatedTransfers} transfers.`);
    process.exit(0);
}

run().catch(console.error);
