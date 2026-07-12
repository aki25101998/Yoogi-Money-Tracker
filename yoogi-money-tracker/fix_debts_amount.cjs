const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');

const FIREBASE_UID = '636pr2WwWAc8Jy7WIUtoZwq6cxE3';
const APP_ID = 'my_installment_app';
const USER_PATH = `artifacts/${APP_ID}/users/${FIREBASE_UID}`;

const SUPABASE_URL = 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4poO77v3akvwthWiLzFmpQ_AmpvQTj_';

let serviceAccount = require('./yoogi-money-tracker-firebase-adminsdk-fbsvc-7ac66a0e13.json');
initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseUserId = 'c361d02e-0f85-4144-84f0-ad70db5eeae3';

function convertTimestamp(value) {
    if (!value) return null;
    if (value._seconds !== undefined) return new Date(value._seconds * 1000).toISOString();
    if (value.toDate && typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
}

async function fix() {
    console.log('Fetching Firebase debts...');
    const fbSnapshot = await firestore.collection(`${USER_PATH}/debts`).get();
    const fbDebts = [];
    fbSnapshot.forEach(d => fbDebts.push({ id: d.id, ...d.data() }));

    console.log(`Found ${fbDebts.length} Firebase debts`);

    console.log('Fetching Supabase debts...');
    const { data: sbDebts, error } = await supabase.from('debts').select('*').eq('user_id', supabaseUserId);
    if (error) throw error;
    
    let updated = 0;
    
    for (const sb of sbDebts) {
        // Find matching FB debt
        // Match by person_name, amount, and date (checking prefix)
        const match = fbDebts.find(fb => {
            const fbDate = convertTimestamp(fb.date);
            const fbAmount = fb.amount || fb.totalAmount || 0;
            const nameMatch = (fb.personName || fb.person_name) === sb.person_name;
            const amountMatch = fbAmount === sb.amount;
            const dateMatch = fbDate && sb.date && fbDate.slice(0, 10) === sb.date.slice(0, 10);
            return nameMatch && amountMatch && dateMatch;
        });
        
        if (match) {
            const fbAmount = match.amount || match.totalAmount || 0;
            const fbRepaid = match.repaidAmount || 0;
            const remaining = fbAmount - fbRepaid;
            
            if (sb.remaining_amount !== remaining) {
                console.log(`Updating ${sb.person_name} - ${sb.amount}: remaining -> ${remaining}`);
                await supabase.from('debts').update({ remaining_amount: remaining }).eq('id', sb.id);
                updated++;
            }
        } else {
            console.log(`No match for ${sb.person_name} - ${sb.amount}`);
        }
    }
    console.log(`Updated ${updated} debts successfully.`);
    process.exit(0);
}

fix();
