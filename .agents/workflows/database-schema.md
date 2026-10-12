---
description: Từ điển dữ liệu (Database Schema Dictionary) và Logic nghiệp vụ cốt lõi. AI BẮT BUỘC ĐỌC khi sửa API kết nối DB.
---

# Từ Điển Dữ Liệu & Database Schema

Tài liệu này giải thích chi tiết cấu trúc Database (Supabase PostgreSQL), các trường dữ liệu, chỉ mục (Index), và **luồng dữ liệu (Data Flow)** của các bảng quan trọng để AI không bao giờ làm hỏng cấu trúc hoặc gây lỗi logic ngầm.

> [!CAUTION]
> Tuyệt đối không xóa, đổi tên bảng, hoặc thay đổi cấu trúc bảng trực tiếp qua raw SQL `DROP/CREATE`. Bắt buộc phải dùng migration scripts (`ALTER TABLE ADD COLUMN IF NOT EXISTS`).

---

## 1. Bảng Giao Dịch (`transactions`)
Trái tim lưu trữ toàn bộ dòng tiền của hệ thống.
- **Các cột chính:**
  - `id`: UUID (Primary Key).
  - `user_id`: UUID (Foreign Key trỏ tới `auth.users`, có RLS).
  - `type`: TEXT. Gồm 6 loại chuẩn:
    - `expense`: Chi tiêu thông thường.
    - `income`: Thu nhập.
    - `transfer`: Chuyển khoản nội bộ (cần `wallet_id` và `to_wallet_id`).
    - `loan_given`: Cho mượn tiền (gắn `debt_id`).
    - `loan_repaid`: Trả nợ hoặc thu tiền trả góp người khác đóng hộ.
    - `installment_repaid`: Thanh toán trả góp cho bản thân người dùng (`owner === 'Tôi'`).
  - `amount`: NUMERIC (luôn lưu số dương).
  - `date`: TIMESTAMPTZ (ngày phát sinh giao dịch).
  - `category_id`: TEXT/UUID (trỏ tới `categories.id`, nullable).
  - `subcategory_id`: TEXT (ID danh mục con, nullable).
  - `wallet_id`: TEXT/UUID (trỏ tới `wallets.id`, nullable).
  - `to_wallet_id`: TEXT/UUID (trỏ tới ví nhận nếu là `transfer`, nullable).
  - `installment_id`: TEXT/UUID (trỏ tới `installments.id`, nullable).
  - `debt_id`: TEXT/UUID (trỏ tới `debts.id`, nullable).
  - `payer_id`, `debtor_id`, `lender_id`: TEXT/UUID (nullable).
  - `note`: TEXT (mô tả giao dịch. Với trả góp, bắt buộc chứa tag `(TMM/YYYY)`).
  - `payment_batch_id`: TEXT/UUID (nhóm các giao dịch được thanh toán cùng 1 đợt).
  - `installment_payment_key`: TEXT (Unique occurrence key: `${user_id}:${installment_id}:${month_str}`).
  - `ai_categorized`: BOOLEAN (đánh dấu giao dịch có do AI phân loại hay không).
- **Unique Constraint:**
  - `transactions_installment_payment_unique (user_id, installment_payment_key) WHERE installment_payment_key IS NOT NULL`.

---

## 2. Bảng Ví Tiền (`wallets`)
- **Các cột chính:** `id`, `user_id`, `name`, `initial_balance`, `balance`, `order`, `icon`, `is_default`.
- **Logic Số Dư (CRITICAL):** Cột `balance` trong DB không phải nguồn dữ liệu tin cậy 100%. Frontend **LUÔN LUÔN** tự tính toán lại số dư thực tế dựa trên công thức:
  $$\text{Current Balance} = \text{initial\_balance} + \sum(\text{income}) - \sum(\text{expense}) - \sum(\text{transfer out}) + \sum(\text{transfer in}) - \sum(\text{loan\_given}) + \sum(\text{loan\_repaid}) - \sum(\text{installment\_repaid})$$
- **Xóa Ví:** Không xóa trực tiếp ở client. Bắt buộc gọi RPC `delete_wallet_safely(p_user_id, p_wallet_id)`.

---

## 3. Bảng Trả Góp (`installments`) & Người Trả Góp (`payers`)
- **Các cột chính của `installments`:**
  - `id`, `user_id`, `name`, `owner`, `payer_id`.
  - `monthly_payment`: Tiền trả góp mỗi tháng.
  - `total_payable`: Tổng tiền cả khoản trả góp.
  - `start_date`: Ngày bắt đầu kỳ hạn.
  - `term`: Số tháng trả góp.
  - `paid_months`: **JSONB Array** (ví dụ `["2026-05", "2026-06"]`). Chỉ chứa các tháng đã thanh toán ĐỦ hoặc vượt định mức `monthly_payment`.
  - `partial_payments`: **JSONB Object** (ví dụ `{"2026-06": 1200000}`). Lưu số tiền lũy kế thực tế đã thanh toán của từng tháng.
- **Hàm RPC liên quan:**
  - `update_installment_payment_atomic(p_user_id, p_installment_id, p_month_str, p_diff_amount)`: Xử lý trả góp lẻ/toàn phần và đồng bộ `paid_months`.
  - `process_bulk_installment_payment(p_user_id, p_wallet_id, p_payment_batch_id, p_date, p_items)`: Thanh toán hàng loạt nguyên khối, chống duplicate bằng `installment_payment_key`.

---

## 4. Bảng Sổ Nợ (`debts`), `debtors` & `lenders`
- **Các cột chính của `debts`:**
  - `id`, `user_id`, `type` (`loan` / `borrow`), `debtor_id`, `lender_id`.
  - `amount`: Tổng số tiền vay/mượn ban đầu.
  - `remaining_amount`: Dư nợ còn lại.
  - `status`: `active` hoặc `paid`.
- **Logic Nghiệp vụ (CRITICAL):**
  - Tuyệt đối **KHÔNG** lưu `repaidAmount` vào DB. Frontend tự tính: `repaidAmount = amount - (remaining_amount || 0)`.
  - Tất toán toàn bộ: Bắt buộc gọi RPC `mark_debt_paid_atomic(p_user_id, p_debt_id, p_wallet_id)`.
  - Cập nhật số tiền nợ: Gọi RPC `update_debt_repayment_atomic(p_user_id, p_debt_id, p_diff_amount)`.

---

## 5. Bảng Ngân Quỹ (`budget_settings` & `budget_portfolios`)
- **`budget_settings`:**
  - `income_category_ids`: Mảng text[] chứa các ID danh mục thu nhập cơ sở.
  - `wallet_ids`: Mảng text[] chứa các ID ví được tính vào thu nhập cơ sở (rỗng = tính tất cả).
- **`budget_portfolios`:**
  - `name`, `icon`, `percentage` (tỷ lệ % từ Base Income).
  - `expense_category_ids`: Mảng text[] chứa các ID danh mục chi tiêu thuộc nhóm quỹ này.
- **Thuật toán Bù trừ chéo (Cross-budgeting):** Tính toán hoàn toàn trên Frontend (bật qua `yoogi_cross_budget_enabled`), không can thiệp vào DB.

---

## 6. Bảng Tự Động Hóa & Hệ Thống
- **`recurring_transactions`:** Có trường `next_date`. Quét 30s/lần trong `App.jsx`, có vòng lặp catch-up bù giờ.
- **`ai_memory`:** Lưu `full_text` (hoặc context) $\rightarrow$ `category_id`, `subcategory_id`. Được cập nhật qua `learnFromCorrection`.
- **`version_history`:** Lưu snapshot dữ liệu người dùng (`id, user_id, name, data, created_at`). Thao tác qua RPC `create_version_snapshot` và `restore_user_data_atomic`.
