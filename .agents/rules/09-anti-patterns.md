# Hiến pháp Phần 9: Những Lệnh CẤM Tuyệt Đối (Anti-patterns)

> BẮT BUỘC TUÂN THỦ: Mọi đoạn mã vi phạm bất kỳ điều nào dưới đây đều bị coi là phá hoại hệ thống và sẽ bị từ chối chấp thuận.

1. **CẤM Vòng Lặp Database Ở Phía Client:**
   Tuyệt đối không dùng vòng lặp (`for`, `map`, `forEach`) ở React/JavaScript để gọi tuần tự hàng loạt lệnh `supabase.update()` hoặc `supabase.delete()`. Mọi thao tác đa bản ghi bắt buộc phải đóng gói thành mảng và gửi qua **Atomic RPC (Stored Procedure)**.

2. **CẤM Quên Bắn Sự Kiện Mutate:**
   Sau bất kỳ thao tác thêm/sửa/xóa nào, không bao giờ được quên gọi `window.dispatchEvent(new CustomEvent('supabase_mutate', ...))`. Quên lệnh này sẽ làm đứt gãy luồng cập nhật UI tức thì của toàn bộ ứng dụng.

3. **CẤM Lưu Cứng Số Dư Thực Tế Của Ví Vào Database:**
   Số dư của ví (`wallets.balance`) trong DB không phải là nguồn tin cậy 100%. Tuyệt đối không dựa vào nó để hiển thị. Số dư thực tế bắt buộc phải được tính toán on-the-fly từ `initial_balance` và mảng `transactions`.

4. **CẤM Sai Lệch Số Học Trong Sổ Nợ:**
   Database chỉ lưu `amount` (tổng nợ) và `remaining_amount` (dư nợ). Tuyệt đối không tạo cột `repaidAmount` trong DB. Frontend bắt buộc phải tự tính `repaidAmount = amount - remaining_amount`.

5. **CẤM Gộp Chung Người Trả Góp (Payers) Và Người Mượn Nợ (Debtors):**
   Đây là 2 thực thể hoàn toàn tách biệt với 2 bảng dữ liệu và quy tắc nghiệp vụ khác nhau. Cấm nhập nhằng gộp chung trong component hoặc service.

6. **CẤM Khai Báo Biến `text[]` Để Hứng Cột `JSONB` Trong Postgres RPC:**
   Cột `paid_months` và `partial_payments` có kiểu `JSONB`. Khai báo biến hứng kiểu `text[]` sẽ kích hoạt lỗi nghiêm trọng `malformed array literal: "[]"`. Luôn khai báo biến là `JSONB` và dùng hàm `COALESCE(val, '[]'::jsonb)`.

7. **CẤM Quên Bù Trừ Dòng Tiền (Reversal & Diff) Khi Sửa/Xóa Giao Dịch:**
   Khi sửa hoặc xóa một transaction thuộc loại `installment_repaid` hoặc `loan_repaid`, **bắt buộc** phải gọi các hàm RPC tương ứng (`update_installment_payment_atomic`, `update_debt_repayment_atomic`) để hoàn tác hoặc bù trừ số dư nợ và kỳ hạn trả góp.

8. **CẤM Nuốt Ngoại Lệ (Silent Exception Swallowing) Trong RPC:**
   Tuyệt đối không viết khối `WHEN OTHERS THEN NULL;` trong Stored Procedure Postgres. Bắt buộc phải `RAISE EXCEPTION` để transaction tự động Rollback hoàn toàn khi có sự cố.

9. **CẤM Chạy Lệnh `DROP TABLE` Phá Hủy Schema:**
   Không bao giờ được chạy lệnh `DROP TABLE` hoặc chạy lại toàn bộ script khởi tạo ban đầu trên Supabase đang chạy thực tế. Luôn sử dụng các câu lệnh `ALTER TABLE ADD COLUMN IF NOT EXISTS` trong file migration.

10. **CẤM Xóa Hoặc Đổi Tên Các Danh Mục Hệ Thống:**
    Các danh mục mặc định cốt lõi như "Chuyển tiền nội bộ", "Chưa phân loại", "Trả nợ", "Trả góp" là xương sống của hệ thống. Nghiêm cấm xóa hoặc làm mất tính toàn vẹn của chúng.

11. **CẤM Sửa File Cấu Hình Gốc Bằng Tay:**
    Không sửa tay `package.json` (hãy dùng `npm install / uninstall`). Không tự ý chỉnh sửa `capacitor.config.json` hay các file môi trường `.env` nếu không có chỉ định đặc biệt.

12. **CẤM Để Rác Dữ Liệu & Sai Khóa Ngoại:**
    Trước khi gửi payload lên Supabase, các trường chuỗi rỗng (`''`) phải được chuyển thành `null`. Không để xảy ra tình trạng lưu nhầm `debt_id` vào cột `installment_id` hoặc map sai ví đích `to_wallet_id`.
