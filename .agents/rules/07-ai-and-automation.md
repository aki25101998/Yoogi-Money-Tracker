# Hiến pháp Phần 7: AI Memory, Giao Dịch Định Kỳ & Sao Lưu (Automation & AI)

## 1. Trợ Lý AI & Bộ Nhớ AI (AI Memory)
Bảng dữ liệu: `ai_memory`.
Hệ thống sử dụng Google Gemini AI để tự động gắn danh mục cho các giao dịch mới nhập vào.
- **Quy trình 2 lớp phân loại:**
  1. **Lớp 1 (Cache/Memory):** Kiểm tra nội dung mô tả (`description`) với các pattern đã lưu trong `ai_memory`. Nếu khớp, áp dụng ngay danh mục tương ứng mà **KHÔNG** tốn chi phí gọi API ra ngoài.
  2. **Lớp 2 (Gemini API):** Nếu Lớp 1 không tìm thấy, gọi API Gemini để phân tích ngữ nghĩa, sau đó tự động lưu kết quả mới vào `ai_memory`.
- **ĐIỀU LUẬT HỌC HỎI BẮT BUỘC (`learnFromCorrection`):**
  - Khi người dùng chủ động sửa (chọn lại) danh mục của một giao dịch đã được AI phân loại, ứng dụng **BẮT BUỘC** phải gọi hàm `learnFromCorrection` để ghi đè trí nhớ AI.
  - Không được bỏ qua bước này vì nó quyết định tính thích ứng thông minh của trợ lý.

## 2. Giao Dịch Định Kỳ (Recurring Transactions)
Bảng dữ liệu: `recurring_transactions` (`next_date`, `frequency`, `amount`, `wallet_id`, `category_id`).
- **Cơ chế kích hoạt:**
  - Vòng lặp `setInterval` chạy ngầm mỗi 30 giây trong `App.jsx`.
  - Kiểm tra các bản ghi có `next_date <= now()`.
  - Tự động tạo bản ghi mới vào bảng `transactions` và cập nhật `next_date` lên chu kỳ kế tiếp.
- **Quy tắc Bù Giờ (Catch-up Loop):**
  - Nếu người dùng tắt ứng dụng trong thời gian dài (nhiều ngày hoặc nhiều tháng), khi mở app lên, hệ thống **bắt buộc** phải có vòng lặp bù giờ: tiếp tục sinh transaction và tăng `next_date` cho đến khi `next_date > now()`. Tuyệt đối không được chỉ sinh 1 giao dịch rồi bỏ qua các chu kỳ bị trễ.

## 3. Hệ Thống Sao Lưu & Khôi Phục (Backup & Version History)
Bảng dữ liệu: `version_history`.
- **Tạo Snapshot:**
  - Sử dụng RPC `create_version_snapshot(p_user_id, p_name)` để đóng gói toàn bộ trạng thái dữ liệu của người dùng thành 1 bản ghi snapshot.
- **Khôi phục Nguyên Khối (Atomic Restore):**
  - Sử dụng RPC `restore_user_data_atomic(p_user_id, p_payload)` để nạp lại dữ liệu trong 1 Database Transaction.
  - **Thứ tự xử lý khóa ngoại bắt buộc:**
    - Thứ tự xóa (`TABLES_DELETE_ORDER`): `transactions`, `recurring_transactions`, `debts`, `installments`, `wallets`, `categories`, `payers`, `debtors`, `lenders`, `ai_memory`, `abbreviations`, `settings`.
    - Thứ tự chèn (`TABLES_INSERT_ORDER`): `settings`, `abbreviations`, `ai_memory`, `lenders`, `debtors`, `payers`, `categories`, `wallets`, `installments`, `debts`, `recurring_transactions`, `transactions`.
- **Dọn Dẹp Bản Lưu Tự Động:**
  - Hàm `cleanupOldAutoVersions` sẽ tự động dọn các bản lưu tự động quá 3 ngày để tối ưu không gian lưu trữ trên Supabase.
