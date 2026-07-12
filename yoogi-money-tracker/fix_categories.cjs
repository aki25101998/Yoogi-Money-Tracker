const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4poO77v3akvwthWiLzFmpQ_AmpvQTj_';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseUserId = 'c361d02e-0f85-4144-84f0-ad70db5eeae3';

async function fixCategories() {
    console.log('Fetching all categories...');
    const { data: categories, error: catErr } = await supabase.from('categories').select('*').eq('user_id', supabaseUserId);
    if (catErr) throw catErr;

    console.log(`Found ${categories.length} categories.`);

    console.log('Fetching all transactions and recurring...');
    const { data: txns, error: txErr } = await supabase.from('transactions').select('id, category_id').eq('user_id', supabaseUserId);
    if (txErr) throw txErr;
    
    const { data: recurrings, error: recErr } = await supabase.from('recurring_transactions').select('id, category_id').eq('user_id', supabaseUserId);
    if (recErr) throw recErr;

    // Group categories by name + type
    const groups = {};
    for (const c of categories) {
        const key = `${c.name}::${c.type}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    }

    let deletedCount = 0;
    let updatedTxnsCount = 0;

    for (const [key, cats] of Object.entries(groups)) {
        if (cats.length > 1) {
            console.log(`\nFound duplicate for ${key} (${cats.length} copies)`);
            
            // Sort to make behavior deterministic
            cats.sort((a, b) => a.created_at.localeCompare(b.created_at));

            // Find usage counts
            const usages = cats.map(c => {
                const usedInTxn = txns.filter(t => t.category_id === c.id).length;
                const usedInRec = recurrings.filter(r => r.category_id === c.id).length;
                return { id: c.id, count: usedInTxn + usedInRec };
            });

            // Decide which one to keep: The one with highest usage, or the first one if all 0
            usages.sort((a, b) => b.count - a.count);
            const keepId = usages[0].id;
            
            console.log(`Keeping ID: ${keepId} (Usage: ${usages[0].count})`);

            // Merge and Delete others
            for (let i = 1; i < usages.length; i++) {
                const dropId = usages[i].id;
                
                // If it was used, update transactions to point to keepId
                if (usages[i].count > 0) {
                    console.log(`Remapping ${usages[i].count} usages from ${dropId} to ${keepId}`);
                    await supabase.from('transactions').update({ category_id: keepId }).eq('category_id', dropId);
                    await supabase.from('recurring_transactions').update({ category_id: keepId }).eq('category_id', dropId);
                    updatedTxnsCount += usages[i].count;
                }

                // Delete the category
                console.log(`Deleting duplicate category: ${dropId}`);
                await supabase.from('categories').delete().eq('id', dropId);
                deletedCount++;
            }
        }
    }

    console.log(`\nDone! Deleted ${deletedCount} duplicate categories. Remapped ${updatedTxnsCount} transactions.`);
    process.exit(0);
}

fixCategories();
