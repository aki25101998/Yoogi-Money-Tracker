# Hiến pháp Phần 2: Cơ sở dữ liệu, RLS & Nguyên tắc chống Race Condition

## 1. Row Level Security (RLS)
- Mọi truy vấn Insert/Update/Delete tới bảng dữ liệu Supabase **BẮT BUỘC** phải truyền `user_id = auth.uid()`. Không được thao tác trên dữ liệu của User khác.
- Tất cả các bảng quan trọng phải có chính sách RLS `(user_id = auth.uid())`.

## 2. Nguyên tắc chống Race Condition (Atomic RPC)
> [!CAUTION]
> Tuyệt đối KHÔNG được sử dụng vòng lặp `for` ở phía Frontend (React/JavaScript) để thực thi hàng loạt các câu lệnh `supabase.from(...).update()` hoặc `.delete()`. Điều này gây ra Race Condition, quá tải server, và dễ gây mất mát dữ liệu nếu trình duyệt bị đóng giữa chừng.

- **ĐIỀU LUẬT TỐI THƯỢNG:** Mọi thao tác Thanh toán số lượng lớn (Payment), Hoàn tác (Reversal), Xoá dữ liệu có ràng buộc phức tạp (như xoá Ví), hoặc Restore Data **BẮT BUỘC** phải được thực hiện bằng **Atomic RPC (Stored Procedures)** trên PostgreSQL.
- Frontend chỉ làm nhiệm vụ: `await supabase.rpc('ten_ham_rpc', { payload_json })` với 1 lượt gọi API duy nhất.

## 3. Thao tác mảng JSONB trong RPC
> [!IMPORTANT]
> Khi thao tác với cột kiểu `JSONB` trong RPC (ví dụ: mảng `paid_months` của bảng `installments`), cực kỳ dễ bị lỗi **Silent DB Failure** nếu giá trị là NULL. 
> Luôn BẮT BUỘC sử dụng `COALESCE(column_name, '[]'::jsonb)` trước khi tính `jsonb_array_length` hoặc làm phép toán thao tác mảng.

## 4. Xoá Dữ Liệu Ràng Buộc Khóa Ngoại (Foreign Keys)
- Schema hiện tại của Supabase ở một số bảng KHÔNG sử dụng `ON DELETE CASCADE`.
- Khi viết hàm xóa (Ví dụ xóa `wallets` hay `payers`), phải tìm và Update/Delete các bản ghi tham chiếu đến chúng trước (set `wallet_id = null` cho bảng `transactions`, v.v) thông qua RPC để đảm bảo tính trọn vẹn của Transaction.
