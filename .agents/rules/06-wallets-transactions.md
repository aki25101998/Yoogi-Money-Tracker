# Hiến pháp Phần 6: Quản Lý Ví & Giao Dịch (Wallets & Transactions)

## 1. Quản Lý Ví (Wallets) & Công Thức Tính Số Dư Tối Thượng
Bảng dữ liệu: `wallets` (`id`, `name`, `initial_balance`, `order`, `icon`, `is_default`).

> [!CAUTION]
> **ĐIỀU LUẬT BẤT DI BẤT DỊCH VỀ SỐ DƯ:**
> Tuyệt đối **KHÔNG BAO GIỜ** lưu cứng số dư thực tế vào database. Phía Frontend luôn tính toán lại số dư của từng ví từ mảng `transactions` theo công thức chuẩn:
> ```javascript
> balances[w.id] = w.initialBalance || 0;
> 
> transactions.forEach(t => {
>     if (t.type === 'income' && balances[t.walletId]) {
>         balances[t.walletId].balance += (t.amount || 0);
>     } else if (t.type === 'expense' && balances[t.walletId]) {
>         balances[t.walletId].balance -= (t.amount || 0);
>     } else if (t.type === 'transfer') {
>         if (balances[t.walletId]) balances[t.walletId].balance -= (t.amount || 0);
>         if (t.transferTo && balances[t.transferTo]) balances[t.transferTo].balance += (t.amount || 0);
>     } else if (t.type === 'loan_given' && balances[t.walletId]) {
>         balances[t.walletId].balance -= (t.amount || 0);
>     } else if (t.type === 'loan_repaid' && balances[t.walletId]) {
>         balances[t.walletId].balance += (t.amount || 0);
>     } else if (t.type === 'installment_repaid' && balances[t.walletId]) {
>         balances[t.walletId].balance -= (t.amount || 0);
>     }
> });
> ```

## 2. Thứ Tự Sắp Xếp & Xóa Ví An Toàn
- **Thứ tự sắp xếp:** Ví được sắp xếp dựa trên cột `order` (tăng dần). Khi kéo thả thay đổi vị trí, gọi `updateWalletOrder` để cập nhật lại chỉ số `order`.
- **Xóa Ví An Toàn (Safe Deletion):**
  - Schema của bảng `transactions` có khóa ngoại trỏ tới `wallets(id)` mà không có `ON DELETE CASCADE`.
  - Tuyệt đối **KHÔNG ĐƯỢC** gọi trực tiếp `supabase.from('wallets').delete()`.
  - **BẮT BUỘC** gọi qua RPC: `supabase.rpc('delete_wallet_safely', { p_user_id, p_wallet_id })`.
  - RPC sẽ set `wallet_id = null` cho các giao dịch tham chiếu trước khi xóa ví, hoặc chặn xóa nếu là ví mặc định.

## 3. Quy Chuẩn Thao Tác Bảng Giao Dịch (`transactions`)
- **Vệ sinh Payload trước khi ghi vào DB:**
  - Không lưu các trường UI thừa như `time` hay `personName` vào bảng `transactions`.
  - Mọi giá trị ID rỗng (`''`) phải được chuyển về `null` trước khi Insert/Update:
    ```javascript
    if (toSave.categoryId === '') toSave.categoryId = null;
    if (toSave.subcategoryId === '') toSave.subcategoryId = null;
    if (toSave.walletId === '') toSave.walletId = null;
    ```
- **Mapping chuyển đổi Casing:**
  - Database Supabase sử dụng `snake_case` (`wallet_id`, `to_wallet_id`, `category_id`, `installment_payment_key`).
  - Frontend sử dụng `camelCase` (`walletId`, `transferTo`, `categoryId`, `installmentPaymentKey`).
  - Mọi service đều phải đi qua `mapToSnakeCase` khi ghi và `mapToCamelCase` khi đọc.

## 4. Bảo Vệ Danh Mục Hệ Thống (Categories)
- Các danh mục mặc định cốt lõi của hệ thống (như "Chuyển tiền nội bộ", "Chưa phân loại", danh mục trả góp/công nợ) **TUYỆT ĐỐI CẤM XÓA**.
- Khi người dùng xóa một danh mục tùy chỉnh, ứng dụng **phải migrate** các giao dịch cũ thuộc danh mục đó sang danh mục "Chưa phân loại" trước khi tiến hành xóa bản ghi danh mục.
