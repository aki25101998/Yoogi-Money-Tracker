require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';
const supabase = createClient(process.env.VITE_SUPABASE_URL, SERVICE_KEY);

async function check() {
    const { data: txns, error } = await supabase.from('transactions').select('*').in('category_id', ['l96A5FO5pecrBzG7vHcr', 'Pv0ctm9CXR5DU9582vAn', 'transfer', 'loan_given', 'loan_repaid']);
    if (error) throw error;
    
    // Let's analyze subcategory_id distribution
    const subcats = {};
    for (const tx of txns) {
        if (!subcats[tx.subcategory_id]) subcats[tx.subcategory_id] = 0;
        subcats[tx.subcategory_id]++;
    }
    
    console.log("Subcategory counts:", subcats);
}
check().catch(console.error);
