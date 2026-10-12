# Hiến pháp Phần 1: Tổng quan và Kiến trúc Lõi (Core Architecture)

> BẮT BUỘC ĐỌC: Đây là nền tảng cốt lõi của dự án Yoogi Money Tracker. Bất kỳ mã nguồn nào vi phạm cấu trúc này đều bị xem là vi phạm hiến pháp.

## 1. Công nghệ & Nền tảng
- **Frontend:** React 18 (Vite), Tailwind CSS, Vite PWA.
- **Nền tảng mục tiêu:** 
  - **Web App:** Deploy tự động qua Vercel.
  - **Mobile App:** Android qua Capacitor 8. App Android cấu hình `server.url` trỏ trực tiếp về Vercel để đồng bộ bản vá nóng (hot-patch) tức thì không cần build lại APK mỗi lần sửa code web.
- **Backend/DB:** Supabase (PostgreSQL), xác thực phân quyền bằng Supabase Auth & Row Level Security (RLS).
- **Auto-Deploy:** Tự động build và deploy qua Vercel ngay khi có push lên GitHub nhánh `master`.

## 2. Phân Loại Giao Dịch Chuẩn (Transaction Taxonomy)
Mọi hoạt động dòng tiền đều được quy về bảng `transactions` duy nhất với 6 loại `type` hợp lệ:
1. `expense`: Chi tiêu thông thường (giảm số dư ví).
2. `income`: Thu nhập (tăng số dư ví).
3. `transfer`: Chuyển tiền nội bộ giữa các ví (giảm ví nguồn `wallet_id`, tăng ví đích `to_wallet_id`).
4. `loan_given`: Cho người khác vay/mượn tiền (giảm số dư ví, liên kết `debt_id`).
5. `loan_repaid`: Người khác trả nợ hoặc thu tiền trả góp người khác đóng hộ (tăng số dư ví, giảm dư nợ `remaining_amount` hoặc ghi nhận kỳ hạn).
6. `installment_repaid`: Thanh toán trả góp cho bản thân người dùng (`owner === 'Tôi'`) (giảm số dư ví, tự động ghi nhận vào `paid_months` và `partial_payments` của khoản trả góp).

> [!CAUTION]
> **ĐIỀU LUẬT TỐI THƯỢNG VỀ SỐ DƯ VÍ:**
> Tuyệt đối KHÔNG lưu cứng "số dư thực tế" (current balance) của ví vào database. Cột `balance` trong DB không phải nguồn tin cậy 100%. Số dư của ví LUÔN LUÔN được tính toán on-the-fly (real-time) ở frontend dựa trên `initial_balance` cộng/trừ với mảng `transactions`.

## 3. Kiến trúc State Management & Realtime Sync
- Dữ liệu được fetch và đồng bộ realtime bằng `supabase.channel` (`postgres_changes`) theo từng bảng và `user_id`.
- **Cơ chế Fallback:** Tự động fetch lại dữ liệu khi tab trình duyệt active (`visibilitychange`) và có interval quét định kỳ mỗi 30 giây để chống trễ WebSocket.
- **Quy tắc Mutate Bắt Buộc:** Sau bất kỳ hành động thêm, sửa, xóa dữ liệu nào thành công ở Frontend, **BẮT BUỘC** phải dispatch event:
  ```javascript
  window.dispatchEvent(new CustomEvent('supabase_mutate', { 
      detail: '<tên_bảng>' // hoặc { table: '<tên_bảng>', action: 'mô tả' }
  }));
  ```
  Nếu tác động đến toàn bộ hệ thống (như import backup hoặc bulk payment), gửi `detail: { table: 'all' }`.
- Quên dispatch event trên sẽ dẫn đến bug nghiêm trọng: giao diện không cập nhật, người dùng tưởng lỗi nên bấm lặp lại gây duplicate dữ liệu.
