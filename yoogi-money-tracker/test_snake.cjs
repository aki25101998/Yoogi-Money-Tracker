const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4poO77v3akvwthWiLzFmpQ_AmpvQTj_';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const toSnakeCase = (str) => {
    if (str === 'transferTo') return 'to_wallet_id';
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const mapToSnakeCase = (obj) => {
    if (Array.isArray(obj)) return obj.map(mapToSnakeCase);
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[toSnakeCase(key)] = mapToSnakeCase(obj[key]);
        }
        return newObj;
    }
    return obj;
};

async function test() {
    const toSave = { type: 'transfer', amount: 1000, walletId: 'w1', transferTo: 'w2' };
    const snaked = mapToSnakeCase(toSave);
    console.log("Snaked:", snaked);
}
test();
