# Supabase Database Schema - Yoogi Money Tracker

Tài liệu này ghi chú chi tiết toàn bộ cấu trúc các bảng (Tables) trong PostgreSQL Database của Yoogi Money Tracker. Đây là tài liệu gốc rễ giúp AI và Developer tham chiếu mỗi khi có các truy vấn dữ liệu.

Tất cả các bảng trong hệ thống đều yêu cầu `Row Level Security (RLS)`. Truy vấn luôn luôn bị giới hạn bởi `user_id = auth.uid()`.

## 1. Các bảng nền tảng (Base Tables)

### 1.1 `settings`
Lưu trữ thiết lập cá nhân của người dùng.
- `id` (text/UUID): Khóa chính
- `user_id` (uuid): Liên kết đến `auth.users`
- `month_start_day` (integer): Ngày bắt đầu tính tháng tài chính (Mặc định: 1)

### 1.2 `categories`
Lưu danh mục thu/chi/chuyển tiền/nợ.
- `id` (text/UUID)
- `user_id` (uuid)
- `name` (text): Tên danh mục (Ví dụ: Ăn uống, Tiền lương)
- `icon` (text): Emoji hoặc Icon
- `type` (text): Loại của danh mục. Cực kỳ quan trọng để filter. Các loại hợp lệ: `expense`, `income`, `transfer`, `loan_given`, `loan_repaid`
- `order` (integer): Thứ tự sắp xếp kéo thả
- `subcategories` (jsonb): Mảng các danh mục con (Cấu trúc: `[{ id: 'string', name: 'string', description: 'string' }]`)

### 1.3 `wallets`
Quản lý các tài khoản/ví tiền.
- `id` (text/UUID)
- `name` (text): Tên ví (VD: Tiền mặt, VPBank)
- `icon` (text)
- `balance` (numeric): Trường phụ (Không đáng tin cậy). Front-end bắt buộc tính toán số dư thực tế dựa trên `initial_balance` + tổng thu chi.
- `initial_balance` (numeric): Số tiền lúc tạo ví
- `is_default` (boolean)
- `order` (integer)

## 2. Bảng phục vụ Sổ Nợ (Debts) & Trả Góp (Installments)

> **LƯU Ý QUAN TRỌNG:** Người mượn/chủ nợ (Debtors/Lenders) hoàn toàn ĐỘC LẬP với danh sách Hợp đồng trả góp (Payers/Installments). Tuyệt đối không gộp chung hoặc join chéo 2 logic này.

### 2.1 `debtors` & `lenders`
Lưu danh sách những người vay mượn. (2 bảng giống hệt nhau về cấu trúc)
- `id` (text/UUID)
- `user_id` (uuid)
- `name` (text): Tên người nợ / chủ nợ (Được AI dùng để đối chiếu khi trích xuất)

### 2.2 `debts`
Lưu các khoản công nợ của người mượn / chủ nợ.
- `id` (text/UUID)
- `type` (text): Loại khoản nợ (VD: 'loan', 'borrow')
- `amount` (numeric): TỔNG số tiền đã cho mượn/đi vay ban đầu.
- `remaining_amount` (numeric): Số tiền CÒN LẠI cần thanh toán. Khi user trả nợ, số này bị trừ đi.
- `status` (text): `'active'` (đang nợ) hoặc `'paid'` (đã xong). Tự động thành `'paid'` nếu `remaining_amount <= 0`.
- `date`, `due_date` (timestamp): Ngày mượn, Ngày hẹn trả
- `person_name` (text): Tên người vay/mượn để hiển thị
- `note` (text)
- `wallet_id` (text)
- *Lưu ý: `repaidAmount` (Đã trả) = `amount` - `remaining_amount` (tính toán on-the-fly ở Front-end).*

### 2.3 `payers` & `installments`
Dành cho danh sách hợp đồng trả góp (Installments).
- **`payers`**: `id`, `name`.
- **`installments`**: 
  - `name` (text): Tên món đồ/khoản trả góp
  - `original_amount` (numeric): Giá gốc
  - `monthly_payment` (numeric): Trả mỗi tháng
  - `total_payable` (numeric): Tổng phải trả (kèm lãi)
  - `term` (integer): Số tháng trả góp
  - `rate` (numeric): Lãi suất
  - `paid_months` (jsonb): Lịch sử các tháng đã đóng
  - `partial_payments` (jsonb): Thanh toán dư/thiếu từng kỳ

## 3. Bảng Giao Dịch (Core)

### 3.1 `transactions`
Xương sống của dự án, mọi biến động số dư đều quy về bảng này.
- `id` (text/UUID)
- `user_id` (uuid)
- `type` (text): `expense`, `income`, `transfer`, `loan_given`, `loan_repaid`
- `amount` (numeric): Số tiền (Tuyệt đối > 0, Front-end tự hiểu là - đối với expense/transfer)
- `date` (timestamp)
- `category_id` (text): ID trỏ đến bảng `categories`
- `subcategory_id` (text): ID của tiểu mục (nằm trong `jsonb` của category)
- `wallet_id` (text): Ví nguồn (bị trừ tiền nếu là expense/transfer)
- `to_wallet_id` (text): Ví đích (NHẬN tiền nếu là transfer)
- `payer_id` (text): Tùy chọn (nếu giao dịch đóng trả góp)
- `installment_id` (text): Tùy chọn (nếu giao dịch của trả góp)
- `fee` (numeric): Phí giao dịch
- `note` (text): Mô tả giao dịch
- `is_recurring` (boolean): Có phải là giao dịch định kỳ không
- `ai_categorized` (boolean): AI có phân loại không?

### 3.2 `recurring_transactions`
Giao dịch lặp lại định kỳ.
- `id` (text/UUID)
- `type`, `amount`, `category_id`, `subcategory_id`, `wallet_id`, `note`
- `frequency` (text): Tần suất (VD: `monthly`, `weekly`, `daily`)
- `next_date` (timestamp): Ngày tiếp theo hệ thống sẽ quét và push vào bảng `transactions`
- `status` (text): `'active'` hoặc `'paused'`

## 4. Các bảng Trí tuệ nhân tạo (AI Tables)

### 4.1 `ai_memory`
Bộ nhớ phân loại ngữ cảnh của User. Khi User sửa lỗi do AI nhận dạng sai, hệ thống insert rule vào đây.
- `id`, `user_id`, `context` (text - từ khóa gợi nhớ), `category_id` (text).

### 4.2 `abbreviations`
Từ điển viết tắt.
- `short` (text): Từ viết tắt (VD: Cơm)
- `full_text` (text): Nghĩa đầy đủ (VD: Ăn Trưa)

### 4.3 `ai_chat_history`
Lưu trữ bối cảnh trò chuyện của user với AI để hỗ trợ câu hỏi có bối cảnh tiếp nối.
- `wallet_id` (text)
- `history` (jsonb): Mảng các tin nhắn role `user` và `assistant`.
