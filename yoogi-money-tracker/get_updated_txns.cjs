require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';
const supabase = createClient(process.env.VITE_SUPABASE_URL, SERVICE_KEY);

async function check() {
    const { data, error } = await supabase.from('transactions').select('*').limit(1);
    if (error) throw error;
    
    if (data.length > 0) {
        console.log("Cols:", Object.keys(data[0]));
    }
}
check().catch(console.error);
