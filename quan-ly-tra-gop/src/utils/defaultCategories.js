// Default 2-level categories based on user's specification
// Each category has subcategories with "Chưa phân loại" always present

export const DEFAULT_EXPENSE_CATEGORIES = [
    {
        name: 'Nhu cầu thiết yếu',
        icon: '🏠',
        type: 'expense',
        order: 1,
        subcategories: [
            { id: 'nha_cua', name: 'Nhà cửa', description: 'Thuê nhà, phí quản lý' },
            { id: 'hoa_don', name: 'Hóa đơn', description: 'Điện, nước, internet' },
            { id: 'an_uong_co_ban', name: 'Ăn uống cơ bản', description: 'Siêu thị, đi chợ' },
            { id: 'di_chuyen', name: 'Di chuyển', description: 'Xăng, bảo dưỡng xe' },
            { id: 'lat_vat', name: 'Lặt vặt & Phát sinh', description: 'Gửi xe, trà đá (Hao hụt)' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
    {
        name: 'Chi tiêu cá nhân',
        icon: '🛍️',
        type: 'expense',
        order: 2,
        subcategories: [
            { id: 'an_ngoai', name: 'Ăn ngoài & Cà phê', description: 'Nhà hàng, đồ ăn nhanh' },
            { id: 'so_thich', name: 'Sở thích & Giải trí', description: 'Xem phim, game' },
            { id: 'mua_sam', name: 'Mua sắm', description: 'Quần áo, giày dép' },
            { id: 'du_lich', name: 'Du lịch', description: 'Trekking, đi chơi xa' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
    {
        name: 'Phát triển & Sức khỏe',
        icon: '💪',
        type: 'expense',
        order: 3,
        subcategories: [
            { id: 'giao_duc', name: 'Giáo dục', description: 'Khóa học, chứng chỉ' },
            { id: 'the_thao', name: 'Thể thao', description: 'Gym, võ thuật' },
            { id: 'suc_khoe', name: 'Sức khỏe', description: 'Khám bệnh, TPCN' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
    {
        name: 'Đầu tư & Tích lũy',
        icon: '📈',
        type: 'expense',
        order: 4,
        subcategories: [
            { id: 'chung_khoan', name: 'Chứng khoán & Quỹ', description: 'Cổ phiếu, ETF' },
            { id: 'crypto', name: 'Crypto', description: 'Bitcoin, Altcoins' },
            { id: 'trading', name: 'Trading', description: 'Vốn MT5, e-commerce' },
            { id: 'tich_luy', name: 'Tích lũy', description: 'Tiết kiệm, Mua vàng' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
    {
        name: 'Giao tế & Nghĩa vụ',
        icon: '🤝',
        type: 'expense',
        order: 5,
        subcategories: [
            { id: 'giao_te', name: 'Giao tế', description: 'Quà tặng, mừng cưới' },
            { id: 'tu_thien', name: 'Từ thiện', description: 'Ủng hộ người nghèo' },
            { id: 'tra_no', name: 'Trả nợ', description: 'Thanh toán Thẻ tín dụng, nợ cũ' },
            { id: 'cho_muon', name: 'Cho mượn', description: 'Đưa tiền mặt cho bạn bè/người thân mượn' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
];

export const DEFAULT_INCOME_CATEGORIES = [
    {
        name: 'Thu nhập Chủ động',
        icon: '💼',
        type: 'income',
        order: 1,
        subcategories: [
            { id: 'luong_chinh', name: 'Lương chính', description: 'Tiền lương' },
            { id: 'thuong', name: 'Thưởng', description: 'KPI, tháng 13' },
            { id: 'lam_them', name: 'Làm thêm', description: 'Freelance' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
    {
        name: 'Thu nhập Thụ động',
        icon: '🌱',
        type: 'income',
        order: 2,
        subcategories: [
            { id: 'lai_tiet_kiem', name: 'Lãi tiết kiệm', description: 'Lãi NH' },
            { id: 'co_tuc', name: 'Cổ tức / Lãi đầu tư', description: 'Lãi ETF, Trade' },
            { id: 'ban_tai_san', name: 'Bán tài sản', description: 'Bán vàng, chốt lời' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
    {
        name: 'Thu nhập Khác',
        icon: '🎁',
        type: 'income',
        order: 3,
        subcategories: [
            { id: 'duoc_tang', name: 'Được tặng', description: 'Quà sinh nhật' },
            { id: 'hoan_tien', name: 'Hoàn tiền', description: 'Cashback' },
            { id: 'chinh_so_quy', name: 'Chỉnh sổ quỹ', description: 'Ghi nhận tiền dư' },
            { id: 'di_vay', name: 'Đi vay / Tạm ứng', description: 'Vay mượn tiền mặt từ người khác/thẻ' },
            { id: 'thu_hoi_no', name: 'Thu hồi nợ', description: 'Người khác trả lại tiền đã mượn' },
            { id: 'chua_phan_loai', name: 'Chưa phân loại', description: 'Mặc định' },
        ],
    },
];

export const ALL_DEFAULT_CATEGORIES = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
];
