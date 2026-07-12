const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'utils', 'supabaseHelpers.js');
let code = fs.readFileSync(filePath, 'utf8');

const mappers = `
// --- MAPPING HELPERS ---
const toCamelCase = (str) => {
    if (str === 'fb_id') return 'fb_id';
    if (str === 'installment_id') return 'debtId';
    if (str === 'person_id') return 'personId';
    if (str === 'wallet_id') return 'walletId';
    if (str === 'to_wallet_id') return 'toWalletId';
    if (str === 'category_id') return 'categoryId';
    if (str === 'subcategory_id') return 'subcategoryId';
    if (str === 'payer_id') return 'payerId';
    if (str === 'debtor_id') return 'debtorId';
    if (str === 'lender_id') return 'lenderId';
    if (str === 'ai_categorized') return 'aiCategorized';
    if (str === 'is_debt_payment') return 'isDebtPayment';
    if (str === 'is_default') return 'isDefault';
    if (str === 'month_start_day') return 'monthStartDay';
    if (str === 'remaining_amount') return 'remainingAmount';
    if (str === 'full_text') return 'longForm';
    if (str === 'short') return 'shortForm';
    if (str === 'context') return 'keyword';
    if (str === 'installment_months') return 'installmentMonths';
    if (str === 'interest_rate') return 'interestRate';
    if (str === 'is_recurring') return 'isRecurring';
    if (str === 'next_date') return 'nextDate';
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

const toSnakeCase = (str) => {
    if (str === 'fb_id') return 'fb_id';
    if (str === 'debtId') return 'installment_id';
    if (str === 'personId') return 'person_id';
    if (str === 'walletId') return 'wallet_id';
    if (str === 'toWalletId') return 'to_wallet_id';
    if (str === 'categoryId') return 'category_id';
    if (str === 'subcategoryId') return 'subcategory_id';
    if (str === 'payerId') return 'payer_id';
    if (str === 'debtorId') return 'debtor_id';
    if (str === 'lenderId') return 'lender_id';
    if (str === 'aiCategorized') return 'ai_categorized';
    if (str === 'isDebtPayment') return 'is_debt_payment';
    if (str === 'isDefault') return 'is_default';
    if (str === 'monthStartDay') return 'month_start_day';
    if (str === 'remainingAmount') return 'remaining_amount';
    if (str === 'longForm') return 'full_text';
    if (str === 'shortForm') return 'short';
    if (str === 'keyword') return 'context';
    if (str === 'installmentMonths') return 'installment_months';
    if (str === 'interestRate') return 'interest_rate';
    if (str === 'isRecurring') return 'is_recurring';
    if (str === 'nextDate') return 'next_date';
    return str.replace(/[A-Z]/g, letter => \`_\${letter.toLowerCase()}\`);
};

export const mapToCamelCase = (obj) => {
    if (Array.isArray(obj)) return obj.map(mapToCamelCase);
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[toCamelCase(key)] = obj[key];
        }
        return newObj;
    }
    return obj;
};

export const mapToSnakeCase = (obj) => {
    if (Array.isArray(obj)) return obj.map(mapToSnakeCase);
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[toSnakeCase(key)] = obj[key];
        }
        return newObj;
    }
    return obj;
};
`;

if (!code.includes('mapToCamelCase')) {
    code = code.replace(
        '// GENERIC HELPERS', 
        '// GENERIC HELPERS\n// ============================================================' + mappers
    );

    code = code.replace('callback(data || [])', 'callback(mapToCamelCase(data || []))');
    
    // settings
    code = code.replace('callback(data);', 'callback(mapToCamelCase(data));');
    code = code.replace('supabase.from(\'settings\').update(settings)', 'supabase.from(\'settings\').update(mapToSnakeCase(settings))');
    code = code.replace('supabase.from(\'settings\').insert([{ ...settings, user_id: userId }])', 'supabase.from(\'settings\').insert([mapToSnakeCase({ ...settings, user_id: userId })])');

    // insert
    code = code.replace(/insert\(\[\{ \.\.\.data, user_id: userId \}\]\)/g, 'insert([mapToSnakeCase({ ...data, user_id: userId })])');
    // insert others
    code = code.replace(/insert\(categoriesToInsert\)/g, 'insert(mapToSnakeCase(categoriesToInsert))');
    code = code.replace(/insert\(walletsToInsert\)/g, 'insert(mapToSnakeCase(walletsToInsert))');

    // update
    code = code.replace(/update\(updates\)/g, 'update(mapToSnakeCase(updates))');

    fs.writeFileSync(filePath, code);
    console.log('Success!');
} else {
    console.log('Already mapped');
}
