# Hiến pháp Phần 5: Nghiệp Vụ Ngân Quỹ & Thu Nhập Cơ Sở (Budgets)

## 1. Cấu Trúc Dữ Liệu
Hệ thống ngân quỹ quản trị dòng tiền theo phương pháp phân bổ tỷ lệ phần trăm từ Thu nhập cơ sở:
- **`budget_settings`:** 
  - `income_category_ids` (text[]): Danh sách ID danh mục/danh mục con được cấu hình là nguồn thu nhập chuẩn.
  - `wallet_ids` (text[]): Danh sách ID các ví được tính vào nguồn thu nhập chuẩn. Nếu mảng rỗng thì tính toàn bộ các ví.
- **`budget_portfolios`:**
  - `name`: Tên nhóm quỹ (VD: Chi tiêu thiết yếu, Tự do tài chính, Giáo dục).
  - `percentage`: Tỷ lệ phần trăm phân bổ từ tổng thu nhập cơ sở (VD: 50%, 20%).
  - `expense_category_ids` (text[]): Danh sách ID danh mục/danh mục con chi tiêu thuộc về nhóm quỹ này.

## 2. Logic Thu Nhập Cơ Sở (Base Income)
Tổng Thu Nhập Cơ Sở (`totalIncome`) là mốc tài chính gốc để phân chia ngân sách cho toàn bộ các danh mục.
- **Điều kiện một giao dịch được tính vào Base Income:**
  1. `isIncomeTransaction(t)`: Giao dịch phải có `type === 'income'`.
  2. **Bộ lọc Ví:** Nếu `budgetSettings.walletIds` có chứa phần tử, thì `t.walletId` bắt buộc phải nằm trong danh sách này.
  3. **Bộ lọc Danh mục:** `t.categoryId` hoặc `t.subcategoryId` phải nằm trong `budgetSettings.incomeCategoryIds`.
- **Giao diện Base Income:**
  - Có modal `BaseIncomeModal.jsx` hiển thị thanh tiến độ, bảng phân tích tỷ trọng các nguồn thu nhập và danh sách chi tiết các giao dịch tương ứng.

## 3. Phân Bổ Ngân Quỹ Cho Từng Portfolio
- **Ngân sách gốc của Quỹ (`originalBudget`):**
  $$\text{originalBudget} = \frac{\text{totalIncome} \times \text{percentage}}{100}$$
- **Số tiền đã chi (`spentAmount`):**
  Tổng các giao dịch chi tiêu (`isExpenseTransaction(t)`) có `categoryId` hoặc `subcategoryId` nằm trong mảng `expense_category_ids` của quỹ trong khoảng thời gian được chọn.

## 4. Thuật Toán Bù Trừ Chéo (Cross-Budgeting)
- **Cơ chế:** Khi người dùng bật tính năng này (lưu trong `localStorage` key `yoogi_cross_budget_enabled`), hệ thống sẽ tự động cân đối tài chính giữa các quỹ:
  - Quỹ bị thâm hụt (`spentAmount > originalBudget`) sẽ tự động mượn hạn mức còn dư từ các quỹ thặng dư (`originalBudget > spentAmount`).
  - Giao diện sẽ hiển thị `currentBudget`, `borrowedAmount`, `lentAmount` tương ứng.
- **ĐIỀU LUẬT BẮT BUỘC:** Thuật toán bù trừ chéo được tính toán **HOÀN TOÀN ON-THE-FLY TẠI FRONTEND**. Tuyệt đối không sinh thêm giao dịch ảo hay can thiệp vào Database Supabase.

## 5. Các Modal Chi Tiết Giao Dịch Ngân Quỹ
- `PortfolioTransactionsModal.jsx`: Hiển thị chi tiết toàn bộ các giao dịch chi tiêu thuộc về một Quỹ.
- `CategoryTransactionsModal.jsx`: Hiển thị chi tiết giao dịch chi tiêu của một Danh mục cụ thể trong Quỹ.
- **Quy chuẩn UX:** Giao diện của hai modal này phải đồng bộ phong cách tối giản, hiển thị ngày, mô tả, số tiền rõ ràng, lược bỏ các nhãn thông tin thừa làm rối mắt người dùng.
