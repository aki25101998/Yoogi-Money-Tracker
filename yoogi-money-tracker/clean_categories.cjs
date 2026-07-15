require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbGJuYWxxbXFrcHF6dm1pZGtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc1NjAzNywiZXhwIjoyMDk5MzMyMDM3fQ.bUImpqofL-aCRim3TzK2N4O5Xup6mrljW8E7al0xtNE';
const supabase = createClient(process.env.VITE_SUPABASE_URL, SERVICE_KEY);

const DEFAULT_CATEGORIES = [
    {
        id: 'nhu_cau_thiet_yeu', name: 'Nhu cầu thiết yếu', icon: '🏠', type: 'expense', order: 1,
        subcategories: [
            { id: 'an_uong_co_ban', name: 'Ăn uống cơ bản', description: 'Cơm, phở, bún hằng ngày' },
            { id: 'di_chuyen', name: 'Di chuyển', description: 'Xăng xe, Grab, gửi xe' },
            { id: 'nha_cua_dien_nuoc', name: 'Nhà cửa & Điện nước', description: 'Tiền thuê nhà, điện, nước, rác' },
            { id: 'sieu_thi_tap_hoa', name: 'Siêu thị, chợ', description: 'Đồ dùng sinh hoạt, thực phẩm' },
        ],
    },
    {
        id: 'chi_tieu_ca_nhan', name: 'Chi tiêu cá nhân', icon: '🛍️', type: 'expense', order: 2,
        subcategories: [
            { id: 'mua_sam', name: 'Mua sắm', description: 'Quần áo, giày dép, phụ kiện' },
            { id: 'lam_dep', name: 'Làm đẹp', description: 'Cắt tóc, mỹ phẩm, spa' },
            { id: 'giai_tri', name: 'Giải trí', description: 'Xem phim, game, netflix' },
            { id: 'cafe_an_vat', name: 'Cafe & Ăn vặt', description: 'Cafe bạn bè, trà sữa' },
        ],
    },
    {
        id: 'phat_trien_cong_viec', name: 'Phát triển & Công việc', icon: '📚', type: 'expense', order: 3,
        subcategories: [
            { id: 'hoc_tap', name: 'Học tập', description: 'Khóa học, sách, thi cử' },
            { id: 'cong_viec', name: 'Công việc', description: 'Công tác, thiết bị làm việc' },
            { id: 'ngoai_giao', name: 'Ngoại giao', description: 'Biếu xén, quà tặng đối tác' },
        ],
    },
    {
        id: 'suc_khoe_the_thao', name: 'Sức khỏe & Thể thao', icon: '💪', type: 'expense', order: 4,
        subcategories: [
            { id: 'the_thao', name: 'Thể thao', description: 'Gym, yoga, đá bóng' },
            { id: 'kham_chua_benh', name: 'Khám chữa bệnh', description: 'Thuốc men, đi viện' },
            { id: 'bao_hiem', name: 'Bảo hiểm', description: 'Bảo hiểm nhân thọ, y tế' },
        ],
    },
    {
        id: 'hieu_hi_quan_he', name: 'Hiếu hỉ & Quan hệ', icon: '🤝', type: 'expense', order: 5,
        subcategories: [
            { id: 'cuoi_hoi_dam_tiec', name: 'Cưới hỏi, đám tiệc', description: 'Mừng cưới, sinh nhật, thôi nôi' },
            { id: 'gia_dinh', name: 'Gia đình', description: 'Biếu bố mẹ, tiền cho con' },
        ],
    },
    {
        id: 'tra_no_tra_gop', name: 'Trả nợ & Trả góp', icon: '💳', type: 'installment_repaid', order: 6,
        subcategories: [
            { id: 'tra_gop', name: 'Trả góp', description: 'Trả tiền mua trả góp hàng tháng' },
            { id: 'tra_no_vay', name: 'Trả nợ vay', description: 'Trả nợ tiền mặt đã vay' }
        ],
    },
    {
        id: 'uncategorized_expense', name: 'Chưa phân loại', icon: '❓', type: 'expense', order: 99,
        subcategories: [],
    },
    {
        id: 'thu_nhap_chu_dong', name: 'Thu nhập Chủ động', icon: '💰', type: 'income', order: 1,
        subcategories: [
            { id: 'luong_chinh', name: 'Lương chính', description: 'Lương từ công việc chính' },
            { id: 'thuong', name: 'Thưởng', description: 'Thưởng KPI, tháng 13' },
            { id: 'lam_them', name: 'Làm thêm', description: 'Freelance, ngoài giờ' },
        ],
    },
    {
        id: 'thu_nhap_thu_dong', name: 'Thu nhập Thụ động', icon: '📈', type: 'income', order: 2,
        subcategories: [
            { id: 'co_tuc_lai_suat', name: 'Cổ tức / Lãi suất', description: 'Lãi tiết kiệm, cổ tức' },
            { id: 'cho_thue', name: 'Cho thuê tài sản', description: 'Tiền thuê nhà, thuê xe' },
        ],
    },
    {
        id: 'thu_nhap_khac', name: 'Thu nhập Khác', icon: '🎁', type: 'income', order: 3,
        subcategories: [
            { id: 'duoc_tang_cho', name: 'Được tặng/cho', description: 'Tiền biếu, quà tặng quy ra tiền' },
            { id: 'hoan_tien', name: 'Hoàn tiền', description: 'Cashback từ thẻ tín dụng' },
            { id: 'thanh_ly_do', name: 'Thanh lý đồ', description: 'Bán đồ cũ' },
        ],
    },
    {
        id: 'uncategorized_income', name: 'Chưa phân loại', icon: '❓', type: 'income', order: 99,
        subcategories: [],
    },
    {
        id: 'transfer', name: 'Chuyển tiền', icon: '💸', type: 'transfer', order: 1,
        subcategories: [],
    },
    {
        id: 'loan_given', name: 'Cho mượn', icon: '📤', type: 'loan_given', order: 1,
        subcategories: [],
    },
    {
        id: 'loan_repaid', name: 'Nhận trả nợ', icon: '📥', type: 'loan_repaid', order: 2,
        subcategories: [],
    }
];

async function go() {
    const { data: categories, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    
    // Group by user_id and NAME to find true duplicates
    const grouped = {};
    for (const cat of categories) {
        const key = `${cat.user_id}_${cat.name}_${cat.type}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(cat);
    }
    
    for (const key in grouped) {
        const group = grouped[key];
        
        // 1. Sort to keep the best one:
        // We prefer the one that has subcategories.length > 0
        // Or the oldest one if none have subcategories
        group.sort((a, b) => {
            const aLen = (a.subcategories || []).length;
            const bLen = (b.subcategories || []).length;
            if (aLen > bLen) return -1;
            if (aLen < bLen) return 1;
            
            // Prefer non-uuid IDs (from default migrations)
            const aIsUuid = a.id.length > 30;
            const bIsUuid = b.id.length > 30;
            if (!aIsUuid && bIsUuid) return -1;
            if (aIsUuid && !bIsUuid) return 1;
            
            return new Date(a.created_at) - new Date(b.created_at);
        });
        
        const keep = group[0];
        const toDelete = group.slice(1);
        
        // Ensure the "keep" one has correct default subcategories and icons if it's a default category
        const def = DEFAULT_CATEGORIES.find(d => d.name === keep.name && d.type === keep.type);
        let updateData = {};
        if (def) {
            if (keep.icon === '📌') updateData.icon = def.icon;
            // Only overwrite subcategories if it currently has none, to avoid destroying user's custom subcategories
            if (!keep.subcategories || keep.subcategories.length === 0) {
                updateData.subcategories = def.subcategories;
            }
        }
        
        if (Object.keys(updateData).length > 0) {
            console.log(`Fixing icon/subcategories for: ${keep.name}`);
            await supabase.from('categories').update(updateData).eq('id', keep.id);
        }
        
        if (toDelete.length > 0) {
            console.log(`Found ${toDelete.length} TRUE duplicate(s) for ${keep.name}. Keeping ID: ${keep.id}`);
            
            for (const cat of toDelete) {
                console.log(`  Deleting duplicate ID: ${cat.id}`);
                // Move transactions to the kept one
                await supabase.from('transactions').update({ category_id: keep.id }).eq('category_id', cat.id);
                await supabase.from('recurring_transactions').update({ category_id: keep.id }).eq('category_id', cat.id);
                // Delete duplicate
                await supabase.from('categories').delete().eq('id', cat.id);
            }
        }
    }
    
    console.log("Cleanup complete!");
}

go().catch(console.error);
