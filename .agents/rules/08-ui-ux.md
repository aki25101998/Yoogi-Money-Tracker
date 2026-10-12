# Hiến pháp Phần 8: Giao Diện (UI/UX) và React Component

## 1. Cấu Trúc React Component & Clean Code
- **Nguyên tắc "Tách Biệt Nghiệp Vụ":** Tránh nhồi nhét xử lý Supabase trực tiếp vào hàm render của Component. Tất cả các hàm kết nối và truy vấn DB phải được tách vào thư mục `src/services/` (ví dụ `coreService.js`, `installmentPaymentService.js`, `debtService.js`, v.v.).
- **Giới hạn Độ Lớn Component:** Bất kỳ file Component nào vượt quá 500–600 dòng đều phải được chia nhỏ thành các sub-components độc lập (điển hình như `DebtDetailsModal.jsx` đã được tách thành `DebtActiveList.jsx` và `DebtHistoryList.jsx`).
- **Quy chuẩn Component Tái Sử Dụng:** Với các Component dùng chung (như `<Card>`, `<Button>`, `<Input>`), **BẮT BUỘC** phải rải (spread) thuộc tính `...props` xuống thẻ gốc. Nếu quên, các sự kiện như `onClick`, `onChange` hay các thuộc tính `disabled` sẽ bị nuốt chửng và không phản hồi.

## 2. Phòng Chống Race Condition & Event Bubbling Trên UI
> [!WARNING]
> Tuyệt đối KHÔNG để các thẻ HTML con (như `<span>`, `<svg>`, `<div>`) bên trong thẻ `<button>` dạng Submit/Thanh toán chiếm quyền Event Bubbling.

- **Class `pointer-events-none`:** BẮT BUỘC phải gắn class `pointer-events-none` cho toàn bộ các icon SVG hoặc text span con bên trong `<button>` để đảm bảo sự kiện `onClick` luôn luôn kích hoạt đúng thẻ gốc.
- **Trạng thái Khóa Nút (Button Lock):** Khi người dùng bấm nút Submit hoặc gọi RPC, nút bấm phải được đặt ngay lập tức vào trạng thái `disabled={isSubmitting}` kèm hiệu ứng xoay spinner, ngăn chặn hoàn toàn việc người dùng nhấp đúp (double click) gây duplicate request.

## 3. Hệ Thống Phân Cấp Z-Index Chuẩn Xác Cho Modals
Hệ thống sử dụng rất nhiều tầng Modal lồng nhau. Để tránh hiện tượng Modal này bị Modal kia che khuất hoặc không bấm được, **BẮT BUỘC** tuân thủ bảng Z-Index sau:
- **`z-50`:** Modal xem chi tiết cơ bản (VD: `DebtDetailsModal`, `InstallmentDetailsModal`).
- **`z-[60]`:* Modal nền lớn (VD: `AddEditModal`).
- **`z-[70]`:* Modal hành động thanh toán hoặc xem danh sách lọc đè lên modal nền (VD: `TransactionModal`, `PayInstallmentModal`, `RepayDebtModal`, `BaseIncomeModal`, `PortfolioTransactionsModal`, `CategoryTransactionsModal`).
- **`z-[90]` - `z-[100]`:* Modal cảnh báo nguy hiểm, Xác nhận (`ConfirmModal`), Quản lý ví (`WalletModal`), và Sidebar lịch sử (`VersionHistorySidebar`).

## 4. Thẩm Mỹ UI & Tối Ưu Mobile (Capacitor Android)
- **Hệ màu chuẩn:**
  - Hỗ trợ song song Dark và Light mode qua class `dark:` của TailwindCSS.
  - Sử dụng các tone màu dịu mắt: `emerald`, `teal`, `cyan` cho số dư/thu nhập; `rose` cho chi tiêu; `amber/orange` cho cảnh báo và công nợ.
- **Micro-interactions:** Mọi nút bấm và thẻ tương tác phải có hiệu ứng phản hồi mượt mà: `transition-all active:scale-95 hover:shadow-md`.
- **Tối giản thông tin (Clutter-free):** Trong các modal danh sách giao dịch theo quỹ hoặc danh mục, ẩn bớt các thông tin trùng lặp (như tên ví hoặc nhãn danh mục đã hiển thị ở tiêu đề) để giao diện thoáng đãng, dễ nhìn.
- **Vùng An Toàn Di Động (Safe Area):** Hỗ trợ padding tránh bị che khuất bởi tai thỏ (notch) hoặc thanh điều hướng Android: sử dụng `pt-safe`, `pb-safe`.
