import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const supabaseAnonKey = 'sb_publishable_z4bj2rImApOsky0rBqWBYQ_uzap5bmF';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixPartialPayments() {
    console.log('Fetching all installments...');
    const { data: installments, error: err1 } = await supabase.from('installments').select('*');
    if (err1) {
        console.error('Error fetching installments:', err1);
        return;
    }

    console.log(`Found ${installments.length} installments. Fetching transactions...`);
    const { data: transactions, error: err2 } = await supabase.from('transactions').select('*').eq('type', 'installment_repaid');
    if (err2) {
        console.error('Error fetching transactions:', err2);
        return;
    }

    console.log(`Found ${transactions.length} installment_repaid transactions.`);

    for (const inst of installments) {
        const relatedTxns = transactions.filter(t => t.installment_id === inst.id);
        const correctPartial = {};
        for (const t of relatedTxns) {
            const dateStr = t.date ? `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}` : null;
            if (dateStr) {
                if (!correctPartial[dateStr]) correctPartial[dateStr] = 0;
                correctPartial[dateStr] += t.amount || 0;
            }
        }

        const oldPartial = inst.partial_payments || {};
        let changed = false;

        // Check if anything in correctPartial differs from oldPartial
        for (const [k, v] of Object.entries(correctPartial)) {
            if (oldPartial[k] !== v) {
                changed = true;
                break;
            }
        }
        // Check if oldPartial has keys not in correctPartial
        for (const [k, v] of Object.entries(oldPartial)) {
            if (correctPartial[k] === undefined && v !== 0) {
                changed = true;
                break;
            }
        }

        if (changed) {
            console.log(`Updating installment ${inst.name} (${inst.id}) partial_payments to:`, correctPartial);
            const { error: updateErr } = await supabase.from('installments').update({ partial_payments: correctPartial }).eq('id', inst.id);
            if (updateErr) {
                console.error(`Failed to update ${inst.id}:`, updateErr);
            } else {
                console.log(`Success updating ${inst.id}`);
            }
        }
    }
    console.log('Done!');
}

fixPartialPayments();
