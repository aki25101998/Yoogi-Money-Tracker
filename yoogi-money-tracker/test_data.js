import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wjlbnalqmqkpqzvmidkc.supabase.co',
  'sb_publishable_z4bj2rImApOsky0rBqWBYQ_uzap5bmF'
);

async function run() {
  const { data: t, error: e1 } = await supabase.from('transactions').select('id').limit(1);
  console.log('TRANSACTIONS:', t, e1);
  const { data: c, error: e2 } = await supabase.from('categories').select('id').limit(1);
  console.log('CATEGORIES:', c, e2);
}
run();
