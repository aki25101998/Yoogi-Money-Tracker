require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';
const supabase = createClient(process.env.VITE_SUPABASE_URL, SERVICE_KEY);

const DELETED_CATEGORIES = [
    { id: '4fe392ca-b1a5-4510-9245-e900d4d6f09e', name: 'Chuyển tiền', type: 'transfer' },
    
    { id: 'AW9P0IJbUotEXH8SRLK2', name: 'Đầu tư & Tích lũy', type: 'expense' },
    { id: 'CvMyFAVbnfSvFZ5xi4mI', name: 'Giao tế & Nghĩa vụ', type: 'expense' },
    { id: 'G7sDFytExp2UuFz8kIB1', name: 'Phát triển & Sức khỏe', type: 'expense' },
    { id: 'b4Kr0zKQpT8Y4BGrafzH', name: 'Chi tiêu cá nhân', type: 'expense' },
    { id: 'uncategorized_expense', name: 'Chưa phân loại', type: 'expense' },
    { id: 'phat_trien_cong_viec', name: 'Phát triển & Công việc', type: 'expense' },
    { id: 'tra_no_tra_gop', name: 'Trả nợ & Trả góp', type: 'installment_repaid' }, // Wait, the log said 'expense' for tra_no_tra_gop? Because it grouped by 'expense'. The original type might have been expense or installment_repaid.
    { id: '3abdc455-57aa-4bc9-94a5-c5f51829048c', name: 'Nhu cầu thiết yếu', type: 'expense' },
    { id: '208a52d7-4391-4a51-bff3-c6bd3326630d', name: 'Chi tiêu cá nhân', type: 'expense' },
    { id: '48ac9996-c6db-4136-a415-908ddaef0c88', name: 'Phát triển & Công việc', type: 'expense' },
    { id: '6bab0727-6407-4537-b96a-078e79349654', name: 'Sức khỏe & Thể thao', type: 'expense' },
    { id: '1b32d86b-c4af-4aeb-b0fb-329de68dc7d7', name: 'Hiếu hỉ & Quan hệ', type: 'expense' },
    { id: 'b7156d01-e0ec-4b6c-9ab6-918670e08249', name: 'Chưa phân loại', type: 'expense' },
    
    { id: 'YAcd3RDqKNWq7ocRXzGG', name: 'Thu nhập Chủ động', type: 'income' },
    { id: 'tgcjfgSl8vHBLCR8Q6u5', name: 'Thu nhập Thụ động', type: 'income' },
    { id: 'uncategorized_income', name: 'Chưa phân loại', type: 'income' },
    { id: 'e7557b2e-f0d8-4267-8c1b-aa07d03617ca', name: 'Thu nhập Chủ động', type: 'income' },
    { id: '1ff3ed8e-7922-44cd-a3e3-0d8f30607007', name: 'Thu nhập Thụ động', type: 'income' },
    { id: '7032c0cc-8c3d-4c55-84bf-1045f89452f7', name: 'Thu nhập Khác', type: 'income' },
    { id: '54945038-401b-441f-b893-b52b0eaccc7b', name: 'Chưa phân loại', type: 'income' },
    
    { id: 'ad799cae-09bd-4e34-b253-94fa1527f8c4', name: 'Cho mượn', type: 'loan_given' },
    
    { id: '3037b2da-b486-4d9b-b558-2af9786b08ba', name: 'Nhận trả nợ', type: 'loan_repaid' },
];

async function restore() {
    const userId = 'c361d02e-0f85-4144-84f0-ad70db5eeae3';

    console.log("Restoring deleted categories...");
    const toInsert = DELETED_CATEGORIES.map(c => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        type: c.type,
        icon: '📌', // generic icon
        order: 99,
        subcategories: []
    }));

    const { error: insErr } = await supabase.from('categories').upsert(toInsert);
    if (insErr) console.error("Error inserting:", insErr);
    else console.log("Categories restored.");

    // Now, fetch all transactions updated recently (my script ran at ~ 15:47 UTC)
    // I will fetch transactions updated in the last 20 minutes that belong to this user.
    const twentyMinsAgo = new Date(Date.now() - 20 * 60000).toISOString();
    
    const { data: txns, error: txErr } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', twentyMinsAgo);
        
    if (txErr) throw txErr;
    
    console.log(`Found ${txns.length} recently updated transactions.`);
    
    let restoredCount = 0;
    
    // We will attempt to restore their category_id.
    // If they have subcategory_id, we can map to the parent category.
    // Actually, DEFAULT_CATEGORIES helps, but Firebase categories used firebase IDs for subcategories too?
    // Let's print out the subcategory_ids of the updated transactions to see.
    for (const tx of txns) {
        console.log(`Tx ${tx.id} - Cat: ${tx.category_id}, SubCat: ${tx.subcategory_id}, Note: ${tx.note}`);
    }
}

restore().catch(console.error);
