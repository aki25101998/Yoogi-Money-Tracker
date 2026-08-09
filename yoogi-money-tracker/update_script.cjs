const fs = require('fs');
const file = 'src/services/transactionService.js';
let content = fs.readFileSync(file, 'utf8');

const target1 = `    delete toSave.time;
    const { data: result, error } = await supabase.from('transactions').insert([mapToSnakeCase({ ...toSave, user_id: userId })]).select().single();
    if (error) throw error;`;

const replace1 = `    delete toSave.time;
    if (toSave.categoryId === '') toSave.categoryId = null;
    if (toSave.subcategoryId === '') toSave.subcategoryId = null;
    if (toSave.walletId === '') toSave.walletId = null;
    const { data: result, error } = await supabase.from('transactions').insert([mapToSnakeCase({ ...toSave, user_id: userId })]).select().single();
    if (error) throw error;`;

const target2 = `    delete toSave.time;
    const result = await supabase.from('transactions').update(mapToSnakeCase(toSave)).eq('id', id).eq('user_id', userId);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', {`;

const replace2 = `    delete toSave.time;
    if (toSave.categoryId === '') toSave.categoryId = null;
    if (toSave.subcategoryId === '') toSave.subcategoryId = null;
    if (toSave.walletId === '') toSave.walletId = null;
    const { data: result, error } = await supabase.from('transactions').update(mapToSnakeCase(toSave)).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw error;
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('supabase_mutate', {`;

content = content.replace(target1, replace1).replace(target2, replace2);
fs.writeFileSync(file, content);
console.log('Updated');
