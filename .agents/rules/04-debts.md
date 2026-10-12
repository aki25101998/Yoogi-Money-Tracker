# Hiến pháp Phần 4: Nghiệp Vụ Sổ Nợ (Debts & Loans)

## 1. Cấu Trúc Dữ Liệu & Nguyên Tắc Số Học
Bảng dữ liệu: `debts`, liên kết với `debtors` (người mượn nợ), `lenders` (người cho vay), và `transactions`.

> [!CAUTION]
> **QUY TẮC SỐ HỌC CỐT LÕI:**
> Database Supabase **CHỈ LƯU**:
> 1. `amount`: Tổng số tiền ban đầu của khoản nợ.
> 2. `remaining_amount`: Dư nợ còn lại chưa thanh toán.
> 
> Tuyệt đối **KHÔNG CÓ CỘT `repaidAmount`** trong database. Phía Frontend **bắt buộc** phải tự tính toán:
> `repaidAmount = amount - (remaining_amount || 0)`.
> Trạng thái hiển thị: `const status = repaidAmount >= amount ? 'paid' : (debt.status || 'active');`.

## 2. Thanh Toán Trả Nợ & RPC Atomic
- **Giao dịch trả nợ:** `type = 'loan_repaid'`. Bắt buộc lưu `debt_id` tham chiếu đến bản ghi nợ.
- **Thanh toán từng phần:**
  - Gọi RPC `update_debt_repayment_atomic(p_user_id, p_debt_id, p_diff_amount)`.
  - RPC sẽ giảm `remaining_amount`. Nếu `remaining_amount <= 0`, tự động đổi `status = 'paid'`.
- **Tất toán nợ nguyên khối (Mark as Paid):**
  - Khi người dùng bấm "Tất toán toàn bộ", **BẮT BUỘC** gọi RPC `mark_debt_paid_atomic(p_user_id, p_debt_id, p_wallet_id)`.
  - RPC sẽ tự động:
    1. Tạo bản ghi transaction `loan_repaid` với số tiền đúng bằng `remaining_amount`.
    2. Cập nhật `remaining_amount = 0` và `status = 'paid'`.
    3. Trả về kết quả atomic trong một transaction DB duy nhất.

## 3. Hoàn Tác & Cân Bằng Dòng Tiền (Reversal & Diff)
- **Khi Sửa giao dịch trả nợ (`updateTransaction`):**
  - Nếu sửa `amount` của một giao dịch `loan_repaid`:
  - Phải tính `diffAmount = updates.amount - oldTxn.amount`.
  - Gọi RPC `update_debt_repayment_atomic(p_user_id, oldTxn.debt_id, diffAmount)` để điều chỉnh lại `remaining_amount` trong DB.
- **Khi Xóa giao dịch trả nợ (`deleteTransaction`):**
  - Nếu xóa một giao dịch `loan_repaid`:
  - Gọi RPC `update_debt_repayment_atomic(p_user_id, txn.debtId, -txn.amount)` để phục hồi lại dư nợ đã giảm.
- **Khi Xóa giao dịch tạo nợ (`loan_given`):**
  - Hành động này đồng nghĩa với việc hủy bỏ toàn bộ khoản nợ gốc. Bắt buộc gọi `deleteDebt(userId, txn.debtId)`.

## 4. Xóa Khoản Nợ An Toàn
- Trước khi xóa bản ghi `debts`, **phải xóa các giao dịch liên quan trước**:
  1. Xóa transactions có `debt_id = id`.
  2. Xóa các transactions cũ từng lưu nhầm `installment_id = id` với type `in ('loan_given', 'loan_repaid', 'debt')` để dọn dẹp triệt để dữ liệu lịch sử.
  3. Xóa bản ghi trong `debts`.
  4. Dispatch event: `window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'debts' }));` và `transactions`.

## 5. Kiến Trúc Giao Diện (UI Component)
- Modal chi tiết nợ (`DebtDetailsModal.jsx`) đã được chia nhỏ thành:
  - `DebtActiveList.jsx`: Quản lý danh sách các khoản nợ đang hoạt động (`active`).
  - `DebtHistoryList.jsx`: Quản lý lịch sử các khoản nợ đã hoàn tất (`paid`).
- Khi phát triển tính năng mới cho Sổ nợ, phải tuân thủ việc phân tách này, tuyệt đối không gom lại thành một component khổng lồ.
