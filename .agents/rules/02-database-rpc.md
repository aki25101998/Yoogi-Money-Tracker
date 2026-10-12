# Hiến pháp Phần 2: Cơ sở dữ liệu, RLS & Quy chuẩn Atomic RPC

## 1. Row Level Security (RLS)
- Mọi truy vấn Insert/Update/Delete tới bảng dữ liệu Supabase **BẮT BUỘC** phải gắn điều kiện `user_id = auth.uid()`. Không bao giờ được phép đọc hoặc ghi đè lên dữ liệu của user khác.
- Mọi hàm RPC (Stored Procedures) chạy dưới quyền `SECURITY DEFINER` phải có dòng kiểm tra an ninh ở đầu hàm:
  ```sql
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'Unauthorized: p_user_id does not match auth.uid()';
  END IF;
  ```

## 2. Nguyên tắc Atomic RPC (Stored Procedures)
> [!CAUTION]
> Tuyệt đối KHÔNG được sử dụng vòng lặp (`for`, `map`, `forEach`) ở phía Frontend (React/JavaScript) để thực thi hàng loạt các câu lệnh `supabase.from(...).update()` hoặc `.delete()`. Điều này gây Race Condition, quá tải server, và rách nát dữ liệu nếu người dùng đóng app hoặc mất mạng giữa chừng.

- **ĐIỀU LUẬT TỐI THƯỢNG:** Mọi thao tác:
  1. Thanh toán hàng loạt (Bulk Installment Payment).
  2. Tất toán nợ nguyên khối (`mark_debt_paid_atomic`).
  3. Hoàn tác hoặc cập nhật thanh toán từng phần (`update_installment_payment_atomic`, `update_debt_repayment_atomic`).
  4. Xóa dữ liệu có ràng buộc khóa ngoại (ví dụ `delete_wallet_safely`).
  5. Sao lưu / Khôi phục dữ liệu toàn bộ (`create_version_snapshot`, `restore_user_data_atomic`).
  **BẮT BUỘC** phải được đóng gói vào **Atomic RPC** trên PostgreSQL.
- Phía Frontend chỉ làm một việc duy nhất: Gộp dữ liệu thành payload JSON/JSONB và gọi `await supabase.rpc('ten_ham_rpc', { ... })`.

## 3. Quy chuẩn Thao Tác JSONB trong PostgreSQL RPC
> [!IMPORTANT]
> Lỗi kinh điển trong PostgreSQL là mismatch giữa kiểu mảng Postgres (`text[]`) và kiểu mảng JSON (`jsonb`). Nếu gán chuỗi JSON `'[]'::jsonb` vào một biến `text[]`, Postgres sẽ báo lỗi: `malformed array literal: "[]"`.

- **Quy tắc khai báo:** Biến hứng dữ liệu từ các cột JSONB (như `paid_months`, `partial_payments`) **PHẢI** khai báo kiểu `JSONB` trong phần `DECLARE` của RPC (Ví dụ: `v_paid_months JSONB;`).
- **Phòng chống Silent DB Failure:** Luôn kiểm tra NULL và kiểu dữ liệu JSON trước khi thao tác:
  ```sql
  IF v_partial_payments IS NULL OR jsonb_typeof(v_partial_payments) <> 'object' THEN
      v_partial_payments := '{}'::jsonb;
  END IF;

  IF v_paid_months IS NULL OR jsonb_typeof(v_paid_months) <> 'array' THEN
      v_paid_months := '[]'::jsonb;
  END IF;
  ```
- **Toán tử JSONB chuẩn:**
  - Kiểm tra phần tử tồn tại: `v_paid_months ? p_month_str`
  - Nối thêm phần tử: `v_paid_months || jsonb_build_array(p_month_str)`
  - Gỡ bỏ phần tử: `v_paid_months - p_month_str`
  - Ghi đè key-value: `jsonb_set(v_partial_payments, ARRAY[p_month_str], to_jsonb(v_new_paid))`

## 4. Khóa Hàng Chống Race Condition (`FOR UPDATE`)
Khi cập nhật các bảng nhạy cảm số dư hoặc kỳ hạn (`installments`, `debts`, `wallets`), RPC **bắt buộc** phải sử dụng mệnh đề `FOR UPDATE` khi SELECT:
```sql
SELECT partial_payments, paid_months, monthly_payment 
INTO v_partial_payments, v_paid_months, v_monthly_payment
FROM public.installments
WHERE id = p_installment_id AND user_id = p_user_id
FOR UPDATE;
```
Điều này đảm bảo hai request gửi đến cùng lúc sẽ được xếp hàng xử lý tuần tự, loại bỏ hoàn toàn xung đột số liệu.

## 5. Cơ chế Idempotency & Tự Phục Hồi (Self-Healing)
- Các bảng nhạy cảm thanh toán phải thiết lập UNIQUE INDEX dựa trên tổ hợp khóa định danh duy nhất (ví dụ `installment_payment_key`).
- Trong RPC, nếu phát hiện transaction với key này đã tồn tại:
  1. Kiểm tra xem các trường liên quan (như `paid_months`) đã được cập nhật chưa. Nếu chưa thì cập nhật bù (Self-healing).
  2. Trả về kết quả `{ success: true, already_processed: true }`.
  3. **KHÔNG** ném ngoại lệ làm sập UI, giúp bảo vệ ứng dụng khỏi hiện tượng double-click hoặc retry mạng.

## 6. Xử lý Lỗi & Transaction Rollback
- Trong RPC PostgreSQL, **TUYỆT ĐỐI KHÔNG NUỐT LỖI** (`WHEN OTHERS THEN NULL;`).
- Nếu có block `EXCEPTION`, bắt buộc phải ném lỗi rõ ràng (`RAISE EXCEPTION 'Chi tiết lỗi: %', SQLERRM;`) để toàn bộ các câu lệnh trong RPC tự động Rollback, đảm bảo tính toàn vẹn tuyệt đối của ACID.
