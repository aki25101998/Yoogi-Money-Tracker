# Bản Thiết Kế Chi Tiết: Tính Năng Lịch Kỷ Luật Chi Tiêu (Daily Spending Discipline Calendar)

**Mã tài liệu:** `2026-11-01-daily-budget-calendar-design`  
**Ngày lập:** 01/11/2026  
**Dự án:** Yoogi Money Tracker  
**Trạng thái:** Chờ Review & Phê duyệt  

---

## 1. Tổng Quan & Mục Tiêu (Executive Summary & Goals)

### 1.1. Bối cảnh & Bài toán người dùng
Người dùng cá nhân thường gặp khó khăn trong việc kiểm soát dòng tiền chi tiêu vặt/sinh hoạt hàng ngày (ăn uống, cà phê, trà sữa, mua sắm lặt vặt). Việc gộp chung tất cả các khoản chi (bao gồm tiền điện, tiền nhà, tiền trả góp định kỳ...) vào cùng một hạn mức ngày khiến việc đánh giá bị sai lệch: chỉ cần một khoản thanh toán hóa đơn điện hoặc trả góp phát sinh trong ngày là người dùng bị đánh giá là "vượt hạn mức ngày", gây cảm giác chán nản và mất động lực duy trì kỷ luật tài chính.

### 1.2. Mục tiêu tính năng
1. **Thiết lập hạn mức chi tiêu mỗi ngày** (ví dụ: `150.000 đ/ngày`), cho phép tùy chỉnh linh hoạt.
2. **Khoanh vùng danh mục theo dõi chỉ định**: Chỉ tính toán các khoản chi thuộc danh mục được người dùng chọn (ví dụ: Ăn uống, Cà phê, Mua sắm vặt). Các khoản chi lớn ngoài danh mục (Tiền điện nước, Tiền nhà, Trả nợ, Trả góp...) hoàn toàn không bị tính vào hạn mức ngày.
3. **Trực quan hóa dạng Lịch tháng (Calendar View)**:
   - Mỗi ô ngày hiển thị trực tiếp số tiền đã chi thuộc danh mục theo dõi và huy hiệu trạng thái: **Đạt (Pass - Màu Xanh)**, **Vượt (Fail - Màu Đỏ)**, hoặc **Tuyệt vời (No-spend Star ⭐ - Màu Xanh Đậm)**.
   - Thao tác click vào từng ngày để mở cửa sổ chi tiết các giao dịch trong ngày đó, hỗ trợ thêm nhanh giao dịch nếu quên ghi chép.
4. **Báo cáo tổng quan tháng & So sánh kỳ vọng**:
   - Thống kê số ngày Hoàn thành, Thất bại và Tỷ lệ thành công (%).
   - So sánh lũy kế từ đầu tháng đến ngày hiện tại (Month-to-Date): Thực tế đã chi vs Kỳ vọng đến nay (ví dụ: chi 2.8M vs kỳ vọng 3.0M $\rightarrow$ Tiết kiệm hơn kỳ vọng 200k).
   - Dự báo hạn mức cho các ngày còn lại trong tháng.

---

## 2. Kiến Trúc & Tuân Thủ Hiến Pháp Yoogi (Architecture & Compliance)

Tính năng tuân thủ nghiêm ngặt Hiến pháp dự án Yoogi Money Tracker:
1. **Quy tắc On-the-fly (Hiến pháp 05-budgets.md & 06-wallets-transactions.md)**:
   - Toàn bộ kết quả Lịch, trạng thái Đạt/Fail từng ngày, tổng tiền lũy kế và kỳ vọng tháng được tính toán **hoàn toàn On-the-fly tại Frontend** dựa trên danh sách `transactions` đã có trong bộ nhớ của App.
   - Tuyệt đối **không tạo bảng lưu log từng ngày ảo** trong Supabase, không sử dụng Trigger hay Cron làm phình to DB.
2. **Đồng bộ thời gian thực (Realtime Reactive)**:
   - Khi người dùng thêm, sửa số tiền, đổi danh mục hoặc xóa bất kỳ giao dịch nào ở trang Giao dịch, trang Lịch Kỷ Luật sẽ tự động cập nhật ngay lập tức mà không cần F5 hay re-fetch dữ liệu.
3. **Phân cấp Modal & Z-Index (Hiến pháp 08-ui-ux.md)**:
   - Cửa sổ xem chi tiết ngày và Cửa sổ cài đặt hạn mức áp dụng z-index chuẩn (`z-50`), chống event bubbling (`pointer-events-none` trên backdrop overlay, dừng propagation khi click dialog).

---

## 3. Mô Hình Dữ Liệu & Lưu Trữ (Data Model & Storage)

### 3.1. Cấu trúc cấu hình (`daily_budget_settings`)
Cấu hình được lưu trữ trên Supabase trong bảng `user_settings` (hoặc bảng độc lập `daily_budget_settings` với RLS theo `user_id`):

```typescript
interface DailyBudgetConfig {
  enabled: boolean;              // Trạng thái kích hoạt tính năng
  daily_limit: number;           // Hạn mức tiền tiêu mỗi ngày (VD: 150000)
  category_ids: string[];        // Danh sách ID danh mục cha/con được áp dụng
  wallet_ids: string[];          // Danh sách ID ví được tính (rỗng [] = toàn bộ ví)
}
```

*Giá trị mặc định ban đầu nếu người dùng chưa cài đặt:*
- `enabled`: `true`
- `daily_limit`: `150000` (150.000 đ)
- `category_ids`: `[]` (hệ thống tự động gợi ý chọn các danh mục ăn uống/sinh hoạt mặc định nếu có)
- `wallet_ids`: `[]` (áp dụng toàn bộ ví)

---

## 4. Thuật Toán Xử Lý & Đánh Giá On-The-Fly (Calculation Engine)

Logic được đóng gói trong Custom Hook: `useDailyDiscipline({ transactions, categories, config, selectedMonth })`.

### 4.1. Lọc giao dịch tháng (Month Filter)
- Chọn tháng hiển thị: `selectedMonth` (định dạng `YYYY-MM`, ví dụ: `2026-11`).
- Xác định khoảng ngày: từ ngày `01` đến ngày cuối cùng của tháng ($N_{\text{total\_days}}$: 28, 29, 30 hoặc 31 ngày).
- Lọc các giao dịch:
  1. `t.type === 'expense'`: Chỉ lấy giao dịch chi tiêu thực tế (bỏ qua thu nhập, chuyển khoản ví, trả nợ, nợ vay).
  2. `isDateInMonth(t.date, selectedMonth)`: Giao dịch thuộc tháng đang chọn (sử dụng chuỗi ngày local `YYYY-MM-DD` để tránh lệch múi giờ UTC).
  3. **Bộ lọc danh mục**: `config.category_ids.includes(t.categoryId) || config.category_ids.includes(t.subcategoryId)`.
  4. **Bộ lọc ví**: Nếu `config.wallet_ids.length > 0`, kiểm tra `config.wallet_ids.includes(t.walletId)`.

### 4.2. Đánh giá trạng thái từng ngày
Với mỗi ngày $d \in [1, N_{\text{total\_days}}]$:
- Tính tổng tiền chi trong ngày của nhóm danh mục: $\text{spent}(d) = \sum \text{amount}(t \in \text{Day } d)$.
- Phân loại trạng thái:
  - **Ngày tương lai ($d > \text{today}$ trong tháng hiện tại):** `status = 'future'`, không tính vào số ngày Đạt/Thất bại.
  - **Ngày hôm nay hoặc quá khứ ($d \le \text{today}$):**
    - Nếu $\text{spent}(d) == 0$: `status = 'no_spend'` (Đạt xuất sắc, huy hiệu ⭐).
    - Nếu $0 < \text{spent}(d) \le \text{daily\_limit}$: `status = 'pass'` (Đạt, huy hiệu &check;).
    - Nếu $\text{spent}(d) > \text{daily\_limit}$: `status = 'fail'` (Vượt mục tiêu, huy hiệu &times;, ghi chú: vượt $\text{spent}(d) - \text{daily\_limit}$).

### 4.3. Tổng hợp chỉ số tháng & So sánh kỳ vọng
- $N_{\text{elapsed}}$: Số ngày đã qua trong tháng tính đến thời điểm hiện tại (nếu xem tháng quá khứ thì $N_{\text{elapsed}} = N_{\text{total\_days}}$).
- $N_{\text{pass}}$: Tổng số ngày có `status === 'pass' || status === 'no_spend'`.
- $N_{\text{fail}}$: Tổng số ngày có `status === 'fail'`.
- Tỷ lệ hoàn thành: $\text{Success Rate} = \frac{N_{\text{pass}}}{N_{\text{elapsed}}} \times 100\%$.
- **Kỳ vọng lũy kế đến hiện tại (Month-to-Date Expected):**
  $$\text{Expected}_{\text{MTD}} = \text{daily\_limit} \times N_{\text{elapsed}}$$
- **Thực tế đã chi lũy kế đến hiện tại (Month-to-Date Actual):**
  $$\text{Actual}_{\text{MTD}} = \sum_{d=1}^{N_{\text{elapsed}}} \text{spent}(d)$$
- **Chênh lệch so với kỳ vọng:**
  $$\text{Diff} = \text{Expected}_{\text{MTD}} - \text{Actual}_{\text{MTD}}$$
  - $\text{Diff} \ge 0$: Đang chi tiêu **đúng kỳ vọng** (Tiết kiệm được $\text{Diff}$ đ).
  - $\text{Diff} < 0$: Đang chi tiêu **vượt quá kỳ vọng** (Lạm chi $|\text{Diff}|$ đ).
- **Ngân sách và Định mức cho các ngày còn lại:**
  - Số ngày còn lại: $N_{\text{remaining}} = N_{\text{total\_days}} - N_{\text{elapsed}}$.
  - Ngân sách trần cả tháng: $\text{Budget}_{\text{Total}} = \text{daily\_limit} \times N_{\text{total\_days}}$.
  - Ngân sách khả dụng còn lại: $\text{Budget}_{\text{Remaining}} = \max(0, \text{Budget}_{\text{Total}} - \text{Actual}_{\text{MTD}})$.
  - Hạn mức chi tiêu trung bình gợi ý mỗi ngày còn lại:
    $$\text{Daily Suggested} = \begin{cases} \frac{\text{Budget}_{\text{Remaining}}}{N_{\text{remaining}}}, & \text{nếu } N_{\text{remaining}} > 0 \\ 0, & \text{nếu } N_{\text{remaining}} = 0 \end{cases}$$

---

## 5. Thiết Kế Giao Diện & Trải Nghiệm Người Dùng (UI/UX Architecture)

### 5.1. Cấu trúc Trang & Điều hướng (Navigation)
- Bổ sung một mục mới vào thanh Menu (Sidebar Desktop & Tabbar Mobile) trong `Layout.jsx`:
  - `id`: `'daily-budget'`
  - `label`: `'Lịch Kỷ Luật'`
  - `icon`: `CalendarCheck` (từ `lucide-react`)
- Tạo Page Component chính: `src/pages/DailyDisciplinePage.jsx`.

### 5.2. Các Thành Phần Giao Diện (Components Hierarchy)
```
DailyDisciplinePage.jsx
├── DailyDisciplineHeader.jsx
│   ├── MonthNavigator (Chuyển tháng: < Tháng 11/2026 >)
│   └── ConfigButton (Nút mở Modal cài đặt hạn mức & danh mục)
├── MonthlySummaryCard.jsx
│   ├── KPI Badges (Số ngày Hoàn thành, Số ngày Thất bại, Tỷ lệ %)
│   ├── MonthToDateProgressBar (Tiến độ thực tế vs kỳ vọng đến hôm nay)
│   └── RemainingAllowanceBanner (Hạn mức còn lại & gợi ý cho các ngày tiếp theo)
├── DisciplineCalendarGrid.jsx
│   ├── WeekdayHeader (Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, Chủ Nhật)
│   └── CalendarDayCells (35 hoặc 42 ô ngày theo ma trận tháng)
│       └── DayCellItem: Số ngày, Số tiền đã tiêu, Badge Đạt/Vượt/No-spend
├── DayDetailsModal.jsx (Popup khi bấm vào một ô ngày)
│   ├── Header: Ngày, Tổng tiền đã tiêu / 150k, Trạng thái Pass/Fail
│   ├── TrackedTransactionsList (Danh sách món chi thuộc hạn mức)
│   ├── QuickAddTransactionButton (Nút thêm nhanh giao dịch cho ngày đó)
│   └── OtherExpensesCollapsible (Khoản chi khác ngoài hạn mức trong ngày)
└── DailyBudgetConfigModal.jsx (Cửa sổ cấu hình)
    ├── Input Hạn mức ngày (VD: 150,000 đ)
    ├── CategoryMultiSelect (Chọn các danh mục áp dụng: Ăn uống, Cà phê...)
    └── WalletFilterSelect (Chọn ví áp dụng hoặc Tất cả ví)
```

### 5.3. Chi tiết thiết kế từng ô ngày trên Lịch (`CalendarDayCells`)
- **Ô ngày đạt ($\le 150k$):** Viền xanh ngọc / nền nhạt (`bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800`), số tiền hiển thị màu xanh lá đậm (vd: `120k`), badge nhỏ `✓ Đạt`.
- **Ô ngày vượt ($> 150k$):** Viền đỏ / nền nhạt (`bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800`), số tiền hiển thị màu đỏ (vd: `195k`), badge nhỏ `✕ Vượt 45k`.
- **Ô ngày không tiêu tiền ($0k$):** Viền lục bảo nổi bật, số tiền `0k`, huy hiệu ngôi sao vàng/xanh ⭐ `Không tiêu`.
- **Ô ngày tương lai:** Nền xám mờ (`bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800`), hiển thị số ngày, số tiền để `--`.
- **Hiệu ứng tương tác:** `hover:scale-[1.02] cursor-pointer transition-all active:scale-[0.98]`.

---

## 6. Xử Lý Các Trường Hợp Biên (Edge Cases & Safety)

1. **Ngày không phát sinh giao dịch nào:**
   - Hệ thống đánh giá là ngày `no_spend` (Đạt xuất sắc). Không gây lỗi chia cho 0 hay undefined.
2. **Xóa hoặc sửa danh mục trong cài đặt chung:**
   - Nếu một danh mục từng được chọn theo dõi bị người dùng xóa ở trang Danh mục, Hook tự động lọc bỏ ID không còn tồn tại, không gây crash ứng dụng.
3. **Múi giờ (Timezone Offset):**
   - Sử dụng định dạng chuẩn `YYYY-MM-DD` từ trường `date` của transaction, không dùng `new Date().toISOString()` để tránh hiện tượng giao dịch 23:30 bị trôi sang ngày hôm sau.
4. **Năm nhuận và số ngày trong tháng:**
   - Sử dụng hàm chuẩn `new Date(year, month, 0).getDate()` để lấy chính xác số ngày trong tháng (28/29 ngày cho tháng 2, 30/31 ngày cho các tháng còn lại).
5. **Xem lại các tháng cũ trong quá khứ:**
   - Khi xem tháng đã kết thúc (ví dụ tháng trước), toàn bộ các ngày trong tháng đó đều được xem là ngày đã qua ($N_{\text{elapsed}} = N_{\text{total\_days}}$), không có ngày `future`.

---

## 7. Kế Hoạch Kiểm Thử & Nghiệm Thu (Verification & Testing)

1. **Kiểm thử logic tính toán (Unit Tests):**
   - Test hàm lọc giao dịch với các loại `income`, `transfer`, `expense`.
   - Test trường hợp tiền điện/tiền trọ phát sinh cùng ngày với tiền ăn uống: Xác nhận tiền điện bị loại bỏ 100%, chỉ tính tiền ăn uống.
   - Test công thức tính số ngày pass/fail, chênh lệch kỳ vọng $\text{Diff}$, và hạn mức gợi ý ngày còn lại.
2. **Kiểm thử tương tác giao diện (Component Integration):**
   - Kiểm tra chuyển tháng tới/lui.
   - Click vào ô ngày mở đúng `DayDetailsModal` với các giao dịch của ngày đó.
   - Thêm/xóa giao dịch phản hồi ngay lập tức trên ô lịch (Zero latency).
3. **Kiểm thử đóng gói di động (Capacitor Android):**
   - Build và kiểm tra layout trên kích thước màn hình điện thoại (thanh cuộn ngang/dọc, chạm tap mượt mà, không giật lag).
   - Chạy `npm run build` đảm bảo không có lỗi biên dịch.

---

## 8. Lộ Trình Triển Khai (Next Steps)
Sau khi tài liệu thiết kế này được phê duyệt:
1. Dispatch Subagent Review để kiểm tra tính toàn vẹn và nhất quán của tài liệu.
2. Tạo Implementation Plan thông qua skill `writing-plans`.
3. Tiến hành code theo từng module nhỏ và kiểm thử tự động.
4. Build APK Android và deploy tự động theo Hiến pháp.