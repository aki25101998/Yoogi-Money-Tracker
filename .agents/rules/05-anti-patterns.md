# Hiến pháp Phần 5: Những lệnh CẤM (Anti-patterns)

> Mọi đoạn code thực hiện các hành vi sau đều bị xem là phá hoại hệ thống.

1. **KHÔNG vòng lặp Database ở Client:** Tuyệt đối không dùng vòng lặp (`for`, `map`) ở Frontend để gọi các lệnh `supabase.update()` hoặc `supabase.delete()`. Hãy gộp dữ liệu thành mảng (array) và gửi 1 lệnh gọi qua Atomic RPC.
2. **KHÔNG quên Mutate:** Không được quên lệnh `dispatchEvent('supabase_mutate')` khi thay đổi dữ liệu, khiến UI không cập nhật đồng bộ.
3. **KHÔNG sai số học ở Sổ Nợ:** Database chỉ trả về tổng tiền nợ (`amount`) và dư nợ (`remaining_amount`). Số tiền Đã Trả (`repaidAmount`) bắt buộc phải do Frontend tự trừ ra.
4. **KHÔNG gộp người mượn:** Tuyệt đối không gộp chung Người mượn (Debtors) và Người trả góp (Payers) trong xử lý dữ liệu.
5. **KHÔNG DROP TABLE bừa bãi:** Không được chạy các lệnh phá hủy Schema (`DROP TABLE`) hay chạy lại `schema_v2.sql` khi chỉ cần thêm cột. Việc này sẽ làm mất toàn bộ dữ liệu thật của người dùng. Luôn dùng lệnh `ALTER TABLE` khi thay đổi cấu trúc dữ liệu đang có.
6. **KHÔNG sửa dữ liệu lõi:** Không xóa các danh mục mặc định quan trọng như "Chuyển tiền nội bộ" hay "Chưa phân loại".
7. **KHÔNG sửa file cấu hình gốc:** Tuyệt đối không sửa `package.json` bằng tay (hãy dùng `npm install`). Không đụng chạm vào `capacitor.config.json` hay `.env` nếu không có chỉ định đặc biệt.
8. **KHÔNG để rác (Duplicate Data):** Khi tự động import/migrate dữ liệu mới, phải quét sạch dữ liệu mặc định rỗng để tránh trùng lặp. Cần đảm bảo các trường khóa ngoại (Foreign Keys) được mapping đúng, tránh gãy dữ liệu (VD: map sai thẻ `transferTo` thành một khóa không tồn tại).
