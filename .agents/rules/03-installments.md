# Hiến pháp Phần 3: Nghiệp Vụ Trả Góp (Installments)

## 1. Bản chất & Cấu trúc Dữ Liệu
Bảng dữ liệu: `installments`, liên kết với `payers` và `transactions`.
> [!CAUTION]
> Tuyệt đối KHÔNG gộp chung Người trả góp (`payers`) với Người nợ (`debtors`). Đây là 2 thực thể độc lập với 2 luồng nghiệp vụ hoàn toàn khác nhau.

- **`paid_months` (JSONB Array):** Lưu mảng các chuỗi tháng mà người dùng đã thanh toán **ĐỦ** hoặc vượt hạn mức hàng tháng. Ví dụ: `["2026-05", "2026-06"]`.
- **`partial_payments` (JSONB Object):** Lưu số tiền thực tế đã đóng của từng tháng (cho các trường hợp trả lẻ, trả tối thiểu, hoặc trả dư). Ví dụ: `{"2026-06": 1200000, "2026-07": 500000}`.
- **`monthly_payment` (numeric):** Số tiền phải đóng định kỳ mỗi tháng.
- **`total_payable` (numeric):** Tổng số tiền phải trả trong suốt kỳ hạn.

## 2. Quy chuẩn Giao Dịch Trả Góp
- **Phân loại giao dịch:**
  - Nếu `owner === 'Tôi'` (chính chủ trả): `type = 'installment_repaid'` (được tính là khoản chi phí trả góp).
  - Nếu `owner !== 'Tôi'` (thu tiền người khác trả góp): `type = 'loan_repaid'` (được tính là thu hồi dòng tiền).
- **Quy chuẩn Mô tả (Description):**
  - Vì người dùng có thể đóng trước hoặc đóng trễ, ngày thực tế giao dịch (`date`) **KHÔNG** đại diện cho kỳ hạn của khoản trả góp.
  - **BẮT BUỘC** phải đính kèm chuỗi tag kỳ hạn vào cuối mô tả giao dịch theo định dạng: `(TMM/YYYY)` (Ví dụ: `Trả góp MacBook (T06/2026)`).
  - Hàm `getInstallmentPaymentMonth(txn)` trong `src/utils/transactionUtils.js` sẽ bóc tách chuỗi này để xác định kỳ tháng (`YYYY-MM`).

## 3. Cơ chế Thanh Toán Từng Phần & RPC `update_installment_payment_atomic`
Khi người dùng thanh toán hoặc sửa số tiền của một kỳ hạn, hàm RPC `update_installment_payment_atomic` xử lý theo quy tắc:
1. Đọc số tiền đã đóng hiện tại: `v_current_paid = COALESCE(partial_payments->>month_str, 0)`.
2. Tính số tiền mới: `v_new_paid = GREATEST(0, v_current_paid + p_diff_amount)`.
3. Cập nhật `v_new_paid` vào `partial_payments`.
4. **Kiểm tra điều kiện hoàn thành kỳ hạn:**
   - Nếu `v_monthly_payment > 0 AND v_new_paid >= v_monthly_payment`: Kỳ hạn này đã đủ tiền $\rightarrow$ Thêm `month_str` vào `paid_months` (nếu chưa có).
   - Nếu `v_new_paid < v_monthly_payment`: Kỳ hạn này chưa đủ tiền $\rightarrow$ Gỡ `month_str` khỏi `paid_months` (nếu có).

## 4. Thanh Toán Hàng Loạt & Idempotency Key
- Bảng `transactions` có trường `installment_payment_key` và UNIQUE INDEX:
  `transactions_installment_payment_unique (user_id, installment_payment_key) WHERE installment_payment_key IS NOT NULL`.
- Cấu trúc key: `${user_id}:${installment_id}:${month_str}`.
- RPC `process_bulk_installment_payment`:
  1. Khóa row trả góp bằng `FOR UPDATE`.
  2. Kiểm tra nếu transaction với key đã tồn tại: tự động kiểm tra `paid_months`, bổ sung nếu thiếu (Self-healing), đánh dấu `already_processed = true` và bỏ qua insert.
  3. Nếu chưa tồn tại: thêm kỳ vào `paid_months` và insert bản ghi `transactions`.
- Frontend **KHÔNG** ném lỗi khi RPC trả về `already_processed = true`.

## 5. Quy tắc Hoàn Tác & Cân Bằng Dòng Tiền (Reversal & Diff)
- **Khi Sửa giao dịch (`updateTransaction`):**
  - Nếu giao dịch có `type === 'installment_repaid'` và `amount` thay đổi:
  - Phải tính `diffAmount = updates.amount - oldTxn.amount`.
  - Gọi `updateInstallmentPartialPayment` với `diffAmount` để số liệu `partial_payments` và `paid_months` được bù trừ chính xác.
- **Khi Xóa giao dịch (`deleteTransaction`):**
  - Nếu giao dịch có `type === 'installment_repaid'`:
  - Phải trích xuất kỳ hạn bằng `getInstallmentPaymentMonth(txn)`.
  - Gọi `updateInstallmentPartialPayment` với `-txn.amount` để khấu trừ lại số tiền đã đóng của kỳ đó trong database.
