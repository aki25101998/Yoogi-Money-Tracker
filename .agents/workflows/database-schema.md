---
description: Từ điển dữ liệu (Database Schema Dictionary) và Logic nghiệp vụ cốt lõi. AI BẮT BUỘC ĐỌC khi sửa API kết nối DB.
---

# Từ Điển Dữ Liệu & Database Schema

Tài liệu này giải thích chi tiết cấu trúc Database (Supabase) và **luồng dữ liệu (Data Flow)** của các bảng quan trọng để AI không vô tình làm hỏng cấu trúc.

> [!CAUTION]
> Tuyệt đối không xóa, đổi tên bảng, hoặc thay đổi cấu trúc bảng trực tiếp qua raw SQL `DROP/CREATE`. Phải dùng migration scripts (`ALTER TABLE`).

## 1. Giao Dịch (Transactions)
**Bảng:** `transactions`
Giao dịch là trái tim của hệ thống.
- **Trường dữ liệu chính:** `id`, `user_id`, `type`, `amount`, `date`, `category_id`, `wallet_id`, `note`.
- Các loại `type` hợp lệ: `expense` (Chi tiêu), `income` (Thu nhập), `transfer` (Chuyển khoản), `loan_given` (Cho mượn tiền), `loan_repaid` (Trả nợ).
- Khi `type` = `transfer`, bắt buộc phải có `to_wallet_id`.
- **Logic:** Số tiền luôn lưu dưới dạng số dương (`numeric`). Việc nó là thu hay chi được định đoạt bởi `type`. 

## 2. Số dư Ví (Wallets)
**Bảng:** `wallets`
- **Trường dữ liệu chính:** `id`, `name`, `initial_balance`, `balance`.
- **Logic Số Dư (CRITICAL):** Số dư của ví (`balance`) trên Supabase **KHÔNG** phải là nguồn dữ liệu tin cậy 100%. Frontend **LUÔN LUÔN** tự tính toán lại số dư thực tế dựa trên công thức: 
  `Current Balance = initial_balance + Tổng(income) - Tổng(expense) - Tổng(transfer out) + Tổng(transfer in) - Tổng(loan_given) + Tổng(loan_repaid)`.

## 3. Công nợ (Debts)
**Bảng:** `debts`, liên kết với `debtors` và `lenders`.
- **Trường dữ liệu chính:** `amount` (Tổng tiền mượn), `remaining_amount` (Số tiền còn nợ lại).
- **Logic Trả Nợ (CRITICAL):** 
  - Không có trường `repaidAmount` lưu trong Database. Frontend **phải tự suy luận**: `repaidAmount = amount - remaining_amount`.
  - Khi có một giao dịch trả nợ (`loan_repaid`), hệ thống sẽ gọi API giảm `remaining_amount` xuống. Nếu `remaining_amount <= 0`, tự động update `status = 'paid'`.

## 4. Trả góp (Installments)
**Bảng:** `installments` và `payers`.
- **Logic (CRITICAL):**
  - Quản lý các kỳ hạn đã đóng thông qua trường JSONB: `paid_months`.
  - Mỗi khi user đóng 1 kỳ, tạo 1 transaction và **push** chuỗi kỳ hạn (VD: `T06/2026`) vào mảng `paid_months`.
  - Không được nhầm lẫn giữa `debtors` (người mượn nợ) và `payers` (người trả góp).

## 5. Danh mục (Categories)
**Bảng:** `categories`
- Các danh mục hệ thống (Transfer, Uncategorized) **TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA**.
- Nếu xóa một danh mục tùy chỉnh, phải map (chuyển) các transactions cũ thuộc danh mục đó sang "Uncategorized" trước khi xóa (tránh lỗi khóa ngoại / giao dịch mất danh mục).

## 6. Giao dịch định kỳ (Recurring Transactions)
**Bảng:** `recurring_transactions`
- Có trường `next_date`. Khi `next_date <= now()`, hệ thống (`App.jsx` vòng lặp 30s) sẽ tự động trigger tạo transaction mới và update `next_date` lên chu kỳ tiếp theo.
