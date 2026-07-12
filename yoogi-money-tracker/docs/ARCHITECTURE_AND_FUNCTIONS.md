# Kiến trúc Mã nguồn & Hàm chức năng (Architecture & Functions)

Tài liệu này cung cấp cái nhìn tổng quan về thư mục, kiến trúc quản lý State và danh sách các hàm xử lý cốt lõi của ứng dụng Yoogi Money Tracker.

## 1. Cấu trúc thư mục (`src/`)

- `src/pages/`: Chứa các Component mức Page (Giao diện chính).
  - `Dashboard.jsx`: Trang chủ tổng quan.
  - `TransactionsPage.jsx`: Ghi chép & quản lý thu chi.
  - `WalletsPage.jsx`: Quản lý ví.
  - `DebtsPage.jsx`: Sổ nợ (Debtors / Lenders).
  - `InstallmentsPage.jsx`: Trả góp (Payers).
  - `SettingsPage.jsx`: Cài đặt hệ thống.
  - `AIChatPage.jsx`: Trò chuyện với AI.

- `src/components/`: Các Component dùng chung.
  - `modals/`: Các popup như `TransactionModal.jsx` (để thêm/sửa giao dịch), `DebtDetailsModal.jsx`.
  - `charts/`: Các biểu đồ dùng Recharts.
  - `ui/`: Các UI Kit cơ bản (Button, Input).

- `src/utils/`: Các file chứa Logic độc lập.
  - `supabaseHelpers.js`: Tương tác với Supabase (CRUD).
  - `aiCategorizer.js`: Logic gọi Gemini AI và tra cứu `ai_memory`.
  - `calculations.js`: Hàm tính toán tổng số dư, báo cáo.
  - `formatters.js`: Format tiền tệ, ngày tháng.
  - `defaultCategories.js`: Data mồi cho User mới.

- `src/config/`:
  - `supabase.js`: Khởi tạo Supabase client.
  - `firebase.js`: Khởi tạo Firebase Auth (Chỉ dùng cho đăng nhập Google).

- `src/App.jsx`: Root component, chứa Layout, Routing, Auth Provider, và logic quét `setInterval` 30s cho Giao dịch định kỳ.

## 2. Quản lý State & Supabase (Core Concept)

### 2.1. Lắng nghe Realtime (`createSubscription`)
Trong `supabaseHelpers.js`, hệ thống dùng hàm wrapper `createSubscription` để bắt Realtime update từ bảng Supabase thông qua `supabase.channel`.
- Hàm này tự động gọi API fetch lần đầu.
- Khi có sự kiện `INSERT/UPDATE/DELETE`, nó sẽ cập nhật state.

### 2.2. Event Mutate (`supabase_mutate`)
Do kiến trúc phức tạp của React khi có nhiều Hook riêng biệt, mỗi khi có một hành động ghi vào database (như `addTransaction`, `deleteDebt`), hệ thống **BẮT BUỘC** phải gọi:
```javascript
window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'table_name' }));
```
Hành động này sẽ giúp các Component khác đang lắng nghe Event này fetch lại dữ liệu để đồng bộ tức thì, tránh lỗi "Xóa xong phải F5 mới mất".

## 3. Danh sách các Hàm Cốt lõi (Core Functions)

Nằm chủ yếu trong `supabaseHelpers.js`:

### 3.1. Nhóm Giao dịch (Transactions)
- `addTransaction(userId, txn)`: Thêm một transaction. Bắn event `supabase_mutate`.
- `updateTransaction(userId, txnId, newData)`: Cập nhật thông tin giao dịch. 
- `deleteTransaction(userId, txnId)`: Xóa giao dịch.
- `subscribeTransactions(userId, month, year, callback)`: Listen giao dịch theo tháng. Hàm này sẽ tự động filter ra các giao dịch trong khoảng đầu tháng (monthStartDay).

### 3.2. Nhóm Sổ Nợ (Debts)
- `addDebt(...)`: Thêm khoản nợ mới, đồng thời tự động chèn một `transaction` loại `loan_given` / `loan_repaid` tương ứng để tiền trong ví tự động thay đổi.
- `updateDebt(...)`: Sửa nợ. (Lưu ý: hàm updateDebt phải update luôn cả `transaction` đi kèm).
- `deleteDebt(...)`: Xóa nợ. (Phải xóa cả `transaction` đi kèm).
- `subscribeDebts(userId, callback)`: Lắng nghe danh sách nợ. Frontend TỰ TÍNH `repaidAmount = d.amount - d.remaining_amount` và tự động đánh dấu `status = 'paid'` nếu trả đủ.

### 3.3. Nhóm AI & Trí nhớ (AI Categorizer)
Nằm trong `aiCategorizer.js`:
- `categorizeTransaction(description, categories, wallets, debtors, payers, aiMemory)`: Hàm phân tích văn bản. Luồng chạy: Tìm bằng Regex/Từ viết tắt -> Tìm trong `aiMemory` -> Gọi Google Gemini AI (2.5 Flash).
- `learnFromCorrection(userId, correctionData)`: Học thói quen người dùng khi người dùng sửa tay một danh mục do AI chọn sai. Lưu vào `ai_memory`.

### 3.4. Nhóm Ví (Wallets)
- `addWallet`, `updateWallet`, `deleteWallet`.
- LƯU Ý: Frontend tự tính số dư: `Wallet Balance = initial_balance + Sum(Income) - Sum(Expense) - Sum(Transfer_Out) + Sum(Transfer_In)`. KHÔNG UPDATE cứng trường `balance` trên database khi có giao dịch.

### 3.5. Nhóm Trả góp (Installments)
- Gồm các bảng `installments` và `payers`.
- Mỗi lần đóng tiền trả góp, user tạo một giao dịch có gắn `installment_id`, ứng dụng sẽ tính tổng các giao dịch này để suy ra tiến độ đóng họ.

## 4. Các Background Task ngầm
Trong `App.jsx`, có một `useEffect` chạy `setInterval` mỗi 30 giây:
- Quét bảng `recurring_transactions` xem có giao dịch nào `next_date <= now` không.
- Nếu có, gọi hàm tạo `transaction` mới, rồi dời `next_date` lên chu kỳ tiếp theo (Dùng hàm `addMonths`, `addWeeks`, `addDays`).
- Lặp lại bằng `while` loop để "bù giờ" (catch up) trong trường hợp app bị tắt vài tháng.
