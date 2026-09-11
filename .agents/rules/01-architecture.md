# Hiến pháp Phần 1: Tổng quan và Kiến trúc Lõi (Core Architecture)

> BẮT BUỘC ĐỌC: Đây là nền tảng cốt lõi của dự án Yoogi Money Tracker. Bất kỳ mã nguồn nào vi phạm cấu trúc này đều là vi phạm hiến pháp.

## 1. Công nghệ & Nền tảng
- **Frontend:** React (Vite), Tailwind CSS, Vite PWA.
- **Nền tảng mục tiêu:** Web App (Vercel) & Mobile App (Android qua Capacitor). App Android trỏ trực tiếp URL về Vercel để đồng bộ bản vá nóng.
- **Backend/DB:** Supabase (PostgreSQL), xác thực bằng Supabase Auth.
- **Auto-Deploy:** Tự động deploy qua Vercel khi push lên GitHub nhánh `master`.

## 2. Quản lý Giao dịch (Transactions)
- Mọi hoạt động thu/chi/chuyển khoản/vay mượn đều được quy về một `transaction` duy nhất.
- **Các type cố định:** `expense` (chi), `income` (thu), `transfer` (chuyển nội bộ), `loan_given` (cho mượn), `loan_repaid` (trả nợ).
- **ĐIỀU LUẬT TỐI THƯỢNG:** Không lưu cứng "số dư thực tế" (current balance) của ví vào database. Số dư của ví LUÔN LUÔN được tính toán on-the-fly (real-time) ở frontend dựa trên `initial_balance` cộng/trừ đi mảng `transactions`.

## 3. Kiến trúc State Management & Realtime
- Dữ liệu được fetch bằng `supabase.channel` để hỗ trợ Realtime Updates.
- **Quy tắc Mutate:** Sau bất kỳ hành động thêm/sửa/xóa dữ liệu nào, **bắt buộc** phải gọi event kích hoạt tải lại State trên Frontend:
  `window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: '<tên_bảng>' }));`
- Nếu bỏ quên lệnh trên, người dùng sẽ bị lỗi giao diện không cập nhật sau khi hành động.
