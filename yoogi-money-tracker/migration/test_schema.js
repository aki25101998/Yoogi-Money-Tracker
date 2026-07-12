const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    const { data, error } = await supabase.rpc('get_schema_info'); // if exists
    // actually, let's just query a known table and check the returned columns
    const tables = ['categories', 'wallets', 'payers', 'debtors', 'lenders', 'debts', 'transactions', 'recurring_transactions', 'abbreviations', 'ai_memory', 'settings'];
    
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(table, 'ERROR:', error.message);
        } else {
            console.log(table, 'COLUMNS:', data.length > 0 ? Object.keys(data[0]) : 'Empty, try insert to get error');
            // to get columns of empty table, we can just insert empty object and catch the error:
            const res = await supabase.from(table).insert({}).select();
            if (res.error) console.log(table, '=>', res.error.message);
        }
    }
}
run();
