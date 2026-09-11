# Hiến pháp Phần 3: Luồng Logic Nghiệp Vụ (Business Logic)

## 1. Sổ Nợ (Debts) & Trả Góp (Installments)
> [!CAUTION]
> Tuyệt đối KHÔNG được gộp chung danh sách Người mượn nợ (Debtors/Lenders) và Người trả góp (Payers). Đây là 2 thực thể độc lập với 2 luồng logic khác nhau.

### 1.1 Sổ Nợ
- Bảng liên quan: `debtors`, `lenders`, `debts`.
- **Logic cốt lõi:** Database Supabase chỉ lưu `amount` (tổng tiền) và `remaining_amount` (dư nợ). Front-end **bắt buộc** phải tự tính `repaidAmount` bằng công thức: `repaidAmount = amount - remaining_amount`.
- Khi thanh toán nợ (`loan_repaid`), hệ thống phải gọi hàm tính toán để trừ trực tiếp vào `remaining_amount`, và tự động đổi `status` thành `paid` nếu `< 0`.

### 1.2 Trả Góp
- Bảng liên quan: `payers`, `installments`.
- **Logic cốt lõi:** Khi người dùng đóng tiền trả góp, vì họ có thể đóng trễ, ngày của giao dịch (`date`) KHÔNG đại diện cho kỳ hạn đóng. Do đó, **bắt buộc** phải chèn tháng kỳ hạn vào mô tả giao dịch theo cú pháp `(TMM/YYYY)` (ví dụ: `(T06/2026)`).
- Khi hoàn tác giao dịch trả góp (xoá transaction), hệ thống phải bóc tách Regex từ chuỗi mô tả để lấy lại kỳ hạn đó và tháo ra khỏi mảng `paid_months`.

## 2. Giao dịch định kỳ (Recurring Transactions)
- Bảng liên quan: `recurring_transactions`.
- **Logic hoạt động:** Dựa vào `setInterval` quét mỗi 30 giây trong `App.jsx`. Nếu `next_date <= now`, hệ thống tự động push một `transaction` vào Database.
- **Quy tắc bắt buộc:** Phải bao gồm logic bù giờ (catch-up) nếu app tắt trong thời gian dài (dùng vòng lặp kiểm tra ngày kế tiếp cho tới khi `next_date > now`).

## 3. Trợ lý AI & AI Memory
- Luồng phân loại AI:
  1. Nếu mô tả (description) trùng với dữ liệu trong `ai_memory`, áp dụng category từ bộ nhớ (không tốn chi phí gọi AI).
  2. Nếu không có, gọi Gemini API phân loại, sau đó tự lưu vào `ai_memory`.
- **Quy tắc bắt buộc:** Bất cứ khi nào người dùng "Sửa" category của một giao dịch do AI phân loại sai, ứng dụng **PHẢI** gọi hàm `learnFromCorrection` để ghi đè trí nhớ AI.

## 4. Quản lý Ngân Quỹ (Budgeting) & Bù Trừ Chéo
- **Tính năng Bù trừ chéo (Cross-budgeting):** Tính toán hoàn toàn trên Frontend. Quỹ bị thâm hụt (deficit) sẽ vay mượn từ quỹ đang thặng dư (surplus) để giảm thiểu cảnh báo. Người dùng bật tắt qua LocalStorage `yoogi_cross_budget_enabled`.
