import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjlbnalqmqkpqzvmidkc.supabase.co';
const supabaseKey = 'sb_publishable_z4bj2rImApOsky0rBqWBYQ_uzap5bmF';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    try {
        console.log('Fetching all loan-related transactions...');
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .in('type', ['loan_given', 'loan_repaid', 'debt']);

        if (error) throw error;
        
        console.log(`Found ${transactions.length} loan transactions.`);
        
        let count = 0;
        for (const txn of transactions) {
            if (txn.installment_id && !txn.debt_id) {
                // Copy installment_id to debt_id
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update({ debt_id: txn.installment_id, installment_id: null })
                    .eq('id', txn.id);
                if (updateError) {
                    console.error(`Error updating ${txn.id}:`, updateError);
                } else {
                    count++;
                }
            }
        }
        
        console.log(`Successfully migrated ${count} transactions from installment_id to debt_id.`);
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

main();
