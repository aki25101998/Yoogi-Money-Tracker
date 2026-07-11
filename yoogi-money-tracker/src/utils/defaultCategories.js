export const DEFAULT_CATEGORIES = [
    // --- CHI TIÊU (EXPENSE) ---
    {
        id: 'nhu_cau_thiet_yeu',
        name: 'Nhu cầu thiết yếu',
        icon: '🏠',
        type: 'expense',
        order: 1,
        subcategories: [
            { id: 'an_uong_co_ban', name: 'Ăn uống cơ bản', description: 'Cơm, phở, bún hằng ngày' },
            { id: 'di_chuyen', name: 'Di chuyển', description: 'Xăng xe, Grab, gửi xe' },
            { id: 'nha_cua_dien_nuoc', name: 'Nhà cửa & Điện nước', description: 'Tiền thuê nhà, điện, nước, rác' },
            { id: 'sieu_thi_tap_hoa', name: 'Siêu thị, chợ', description: 'Đồ dùng sinh hoạt, thực phẩm' },
        ],
    },
    {
        id: 'chi_tieu_ca_nhan',
        name: 'Chi tiêu cá nhân',
        icon: '🛍️',
        type: 'expense',
        order: 2,
        subcategories: [
            { id: 'mua_sam', name: 'Mua sắm', description: 'Quần áo, giày dép, phụ kiện' },
            { id: 'lam_dep', name: 'Làm đẹp', description: 'Cắt tóc, mỹ phẩm, spa' },
            { id: 'giai_tri', name: 'Giải trí', description: 'Xem phim, game, netflix' },
            { id: 'cafe_an_vat', name: 'Cafe & Ăn vặt', description: 'Cafe bạn bè, trà sữa' },
        ],
    },
    {
        id: 'phat_trien_cong_viec',
        name: 'Phát triển & Công việc',
        icon: '📚',
        type: 'expense',
        order: 3,
        subcategories: [
            { id: 'hoc_tap', name: 'Học tập', description: 'Khóa học, sách, thi cử' },
            { id: 'cong_viec', name: 'Công việc', description: 'Công tác, thiết bị làm việc' },
            { id: 'ngoai_giao', name: 'Ngoại giao', description: 'Biếu xén, quà tặng đối tác' },
        ],
    },
    {
        id: 'suc_khoe_the_thao',
        name: 'Sức khỏe & Thể thao',
        icon: '💪',
        type: 'expense',
        order: 4,
        subcategories: [
            { id: 'the_thao', name: 'Thể thao', description: 'Gym, yoga, đá bóng' },
            { id: 'kham_chua_benh', name: 'Khám chữa bệnh', description: 'Thuốc men, đi viện' },
            { id: 'bao_hiem', name: 'Bảo hiểm', description: 'Bảo hiểm nhân thọ, y tế' },
        ],
    },
    {
        id: 'hieu_hi_quan_he',
        name: 'Hiếu hỉ & Quan hệ',
        icon: '🤝',
        type: 'expense',
        order: 5,
        subcategories: [
            { id: 'cuoi_hoi_dam_tiec', name: 'Cưới hỏi, đám tiệc', description: 'Mừng cưới, sinh nhật, thôi nôi' },
            { id: 'gia_dinh', name: 'Gia đình', description: 'Biếu bố mẹ, tiền cho con' },
        ],
    },
    {
        id: 'tra_no_tra_gop',
        name: 'Trả nợ & Trả góp',
        icon: '💳',
        type: 'installment_repaid',
        order: 6,
        subcategories: [
            { id: 'tra_gop', name: 'Trả góp', description: 'Trả tiền mua trả góp hàng tháng' },
            { id: 'tra_no_vay', name: 'Trả nợ vay', description: 'Trả nợ tiền mặt đã vay' }
        ],
    },
    {
        id: 'uncategorized_expense',
        name: 'Chưa phân loại',
        icon: '❓',
        type: 'expense',
        order: 99,
        subcategories: [],
    },

    // --- THU NHẬP (INCOME) ---
    {
        id: 'thu_nhap_chu_dong',
        name: 'Thu nhập Chủ động',
        icon: '💰',
        type: 'income',
        order: 1,
        subcategories: [
            { id: 'luong_chinh', name: 'Lương chính', description: 'Lương từ công việc chính' },
            { id: 'thuong', name: 'Thưởng', description: 'Thưởng KPI, tháng 13' },
            { id: 'lam_them', name: 'Làm thêm', description: 'Freelance, ngoài giờ' },
        ],
    },
    {
        id: 'thu_nhap_thu_dong',
        name: 'Thu nhập Thụ động',
        icon: '📈',
        type: 'income',
        order: 2,
        subcategories: [
            { id: 'co_tuc_lai_suat', name: 'Cổ tức / Lãi suất', description: 'Lãi tiết kiệm, cổ tức' },
            { id: 'cho_thue', name: 'Cho thuê tài sản', description: 'Tiền thuê nhà, thuê xe' },
        ],
    },
    {
        id: 'thu_nhap_khac',
        name: 'Thu nhập Khác',
        icon: '🎁',
        type: 'income',
        order: 3,
        subcategories: [
            { id: 'duoc_tang_cho', name: 'Được tặng/cho', description: 'Tiền biếu, quà tặng quy ra tiền' },
            { id: 'hoan_tien', name: 'Hoàn tiền', description: 'Cashback từ thẻ tín dụng' },
            { id: 'thanh_ly_do', name: 'Thanh lý đồ', description: 'Bán đồ cũ' },
        ],
    },
    {
        id: 'uncategorized_income',
        name: 'Chưa phân loại',
        icon: '❓',
        type: 'income',
        order: 99,
        subcategories: [],
    },

    // --- CHUYỂN TIỀN (TRANSFER) ---
    {
        id: 'transfer',
        name: 'Chuyển tiền',
        icon: '💸',
        type: 'transfer',
        order: 1,
        subcategories: [],
    },

    // --- CHO MƯỢN / NHẬN TRẢ NỢ (LOAN) ---
    {
        id: 'loan_given',
        name: 'Cho mượn',
        icon: '📤',
        type: 'loan_given',
        order: 1,
        subcategories: [],
    },
    {
        id: 'loan_repaid',
        name: 'Nhận trả nợ',
        icon: '📥',
        type: 'loan_repaid',
        order: 2,
        subcategories: [],
    },
];

export const DEFAULT_WALLETS = [
    { name: 'Tiền mặt', icon: '💵', initialBalance: 0, isDefault: true, order: 0 },
    { name: 'Tài khoản ngân hàng', icon: '🏦', initialBalance: 0, isDefault: false, order: 1 },
    { name: 'Thẻ tín dụng', icon: '💳', initialBalance: 0, isDefault: false, order: 2 },
    { name: 'Ví điện tử', icon: '📱', initialBalance: 0, isDefault: false, order: 3 },
];

