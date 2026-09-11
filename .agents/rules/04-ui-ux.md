# Hiến pháp Phần 4: Giao diện (UI/UX) và React Component

## 1. Cấu trúc React Component
- **Nguyên tắc "Tách biệt":** Tránh nhồi nhét quá nhiều logic (như gọi DB phức tạp) vào trực tiếp Component render. Tách các hàm gọi Supabase ra `services/` (ví dụ `supabaseHelpers.js` hoặc `coreService.js`).
- Các file Component khổng lồ (trên 600 dòng) như `DebtDetailsModal`, `PayInstallmentModal` cần được cân nhắc chia nhỏ trong tương lai.
- Với các Component dùng chung (như `<Card>`, `<Button>`), **PHẢI** kiểm tra kỹ xem Component đó có rải (spread) thuộc tính `...props` xuống thẻ gốc không. Nếu quên, các sự kiện như `onClick` sẽ bị "nuốt" và không hoạt động.

## 2. Event Bubbling (Lưu ý Race Condition trên UI)
> [!WARNING]
> Tuyệt đối KHÔNG để các thẻ HTML con (như `<span>`, `<svg>`, `<div>`) bên trong thẻ `<button>` dạng "Submit/Thanh toán" chiếm quyền Event Bubbling.
> BẮT BUỘC phải gắn class `pointer-events-none` cho các thẻ con này để đảm bảo sự kiện onClick luôn rơi vào thẻ gốc `<button>`. Tránh hiện tượng ấn nhầm làm kích hoạt nhiều luồng thanh toán chồng chéo.

## 3. UI/UX & CSS
- **Chế độ màu:** Hỗ trợ song song Dark/Light mode qua class `dark:` của TailwindCSS.
- **Màu sắc an toàn:** Dùng `emerald`, `teal`, `cyan` cho cảm giác tài chính. Dùng `rose` cho chi tiêu, `amber/orange` cho cảnh báo hoặc nợ nần. Không dùng các màu sắc chói mắt.
- **Animation:** Bắt buộc sử dụng các hiệu ứng chuyển cảnh mượt mà như `transition-all`, `hover:-translate-y-1`, `active:scale-95` cho các nút bấm (Micro-interactions).

## 4. Quản lý Z-index cho Modals
Hệ thống sử dụng rất nhiều Modal (Cửa sổ bật lên). BẮT BUỘC tuân thủ phân cấp Z-Index sau để Modal không bị che khuất:
- `z-50`: Modal cơ bản hiển thị chi tiết (VD: `DebtDetailsModal`).
- `z-[60]`: Modal nền lớn gọi nhiều modal khác (VD: `AddEditModal`).
- `z-[70]`: Modal chỉnh sửa / giao dịch (VD: `TransactionModal`, `PayInstallmentModal`) để luôn nằm đè lên Modal `z-[60]`.
- `z-[90]` - `z-[100]`: Modal cảnh báo nguy hiểm, Xác nhận (`ConfirmModal`), hay Quản lý hệ thống (`WalletModal`).
