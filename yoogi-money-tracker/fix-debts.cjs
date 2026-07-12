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
    const snap = await db.collection(USER_PATH + '/debts').get();
    console.log('Found ' + snap.size + ' debts in Firebase');
    
    for (const docSnap of snap.docs) {
        const doc = docSnap.data();
        
        const amount = doc.amount || doc.totalAmount || 0;
        const repaidAmount = doc.repaidAmount || 0;
        
        let remainingAmount = doc.remainingAmount !== undefined ? doc.remainingAmount : (doc.remaining_amount !== undefined ? doc.remaining_amount : amount - repaidAmount);
        const status = remainingAmount <= 0 ? 'paid' : (doc.status || 'active');
        
        // Find matching debt in Supabase
        const note = doc.note || doc.notes || '';
        const personName = doc.personName || doc.person_name || '';
        
        // We might have multiple debts with same name and note, so we can just update all that match and haven't been updated yet?
        // Or we can just use the created_at / date if needed. But name, note, and amount should be unique enough for most.
        let query = supabase.from('debts')
            .select('id')
            .eq('user_id', supabaseUserId)
            .eq('amount', amount);
            
        if (personName) query = query.eq('person_name', personName);
        else query = query.is('person_name', null);
        
        if (note) query = query.eq('note', note);
        else query = query.is('note', null);
            
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching match:', error);
            continue;
        }
        
        if (data && data.length > 0) {
            const supabaseId = data[0].id; // Just update the first match
            await supabase.from('debts').update({
                remaining_amount: remainingAmount,
                status: status
            }).eq('id', supabaseId);
            console.log(`Updated ${personName} - ${note} -> remaining: ${remainingAmount}, status: ${status}`);
        } else {
            console.log(`Could not find match for ${personName} - ${note} with amount ${amount}`);
        }
    }
    
    console.log('Done');
    process.exit(0);
}

run();
