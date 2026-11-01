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

### 3.1. Bảng cấu hình Supabase (`daily_budget_settings`)
Tạo migration chuẩn `yoogi-money-tracker/database_migrations/14_create_daily_budget_settings.sql`:

```sql
create table if not exists public.daily_budget_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    enabled boolean not null default true,
    daily_limit numeric not null default 150000,
    category_ids text[] not null default '{}',
    wallet_ids text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.daily_budget_settings enable row level security;

create policy "Users can manage their own daily budget settings"
    on public.daily_budget_settings
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
```

### 3.2. Cấu trúc TypeScript Interface
```typescript
interface DailyBudgetConfig {
  user_id: string;
  enabled: boolean;              // Trạng thái kích hoạt tính năng
  daily_limit: number;           // Hạn mức tiền tiêu mỗi ngày (VD: 150000)
  category_ids: string[];        // Danh sách ID danh mục cha/con được áp dụng
  wallet_ids: string[];          // Danh sách ID ví được tính (rỗng [] = toàn bộ ví)
}
```

### 3.3. Xử lý Trạng thái Khởi tạo Ban Đầu (Initial Setup State)
- Nếu người dùng mới chưa cấu hình hoặc `category_ids.length === 0`:
  - **Setup Banner:** Hiển thị banner hướng dẫn ở đầu trang: *"Bạn chưa chọn danh mục chi tiêu áp dụng cho Kỷ luật ngày (ví dụ: Ăn uống, Cà phê...)"* kèm nút **"Thiết lập ngay"**.
  - **Smart Pre-selection:** Khi mở modal cấu hình lần đầu, hệ thống tự động quét danh sách categories hiện có của user: nếu danh mục/danh mục con chứa các từ khóa (`"ăn"`, `"uống"`, `"cà phê"`, `"cafe"`, `"ăn vặt"`, `"đi chợ"`), hệ thống tự động tick sẵn làm gợi ý để người dùng chỉ cần bấm 1 click để kích hoạt.
  - **Tránh kết quả ảo:** Khi chưa chọn danh mục nào (`category_ids.length === 0`), lịch **không** hiển thị 100% sao ⭐ "Không tiêu" ảo, mà hiển thị trạng thái chờ cấu hình.

---

## 4. Thuật Toán Xử Lý & Đánh Giá On-The-Fly (Calculation Engine)

Logic được đóng gói trong Custom Hook: `useDailyDiscipline({ transactions, categories, config, selectedMonth })` tại `yoogi-money-tracker/src/hooks/useDailyDiscipline.js`.

### 4.1. Lọc giao dịch tháng (Month Filter)
- Xác định tháng hiển thị: `selectedMonth` (định dạng `YYYY-MM`, ví dụ: `2026-11`).
- Xác định số ngày trong tháng $N_{\text{total\_days}}$ bằng `new Date(year, month, 0).getDate()` (xử lý chính xác 28, 29, 30, 31 ngày).
- Lọc giao dịch:
  1. `t.type === 'expense'`: Bỏ qua thu nhập, chuyển ví, nợ.
  2. Ngày giao dịch thuộc `selectedMonth`: so sánh chuỗi `t.date.startsWith(selectedMonth)` (chuỗi local `YYYY-MM-DD` chống lệch UTC).
  3. **Bộ lọc danh mục**: `config.category_ids.includes(t.categoryId) || config.category_ids.includes(t.subcategoryId)`.
  4. **Bộ lọc ví**: Nếu `config.wallet_ids.length > 0`, kiểm tra `config.wallet_ids.includes(t.walletId)`.

### 4.2. Phân nhánh Ngữ cảnh Thời Gian & Đánh giá Trạng thái Ngày

Hệ thống phân biệt rõ ràng 3 ngữ cảnh thời gian:

#### Ngữ cảnh A: Tháng hiện tại (`selectedMonth === currentMonth`)
- $N_{\text{elapsed}} = \text{today.getDate()}$ (số ngày đã trôi qua tính đến hôm nay).
- Ngày $d \le \text{today}$:
  - $\text{spent}(d) == 0$: `status = 'no_spend'` (⭐ Tuyệt vời - Không tiêu).
  - $0 < \text{spent}(d) \le \text{daily\_limit}$: `status = 'pass'` (✓ Đạt).
  - $\text{spent}(d) > \text{daily\_limit}$: `status = 'fail'` (✕ Vượt $\text{spent}(d) - \text{daily\_limit}$).
- Ngày $d > \text{today}$: `status = 'future'` (Màu xám, chưa diễn ra).

#### Ngữ cảnh B: Tháng trong quá khứ (`selectedMonth < currentMonth`)
- $N_{\text{elapsed}} = N_{\text{total\_days}}$ (toàn bộ các ngày trong tháng đều đã kết thúc).
- Toàn bộ các ngày $d \in [1, N_{\text{total\_days}}]$ đều được đánh giá `pass`, `fail` hoặc `no_spend`.
- Không có bất kỳ ngày nào là `future`.

#### Ngữ cảnh C: Tháng trong tương lai (`selectedMonth > currentMonth`)
- $N_{\text{elapsed}} = 0$ (chưa có ngày nào diễn ra).
- Toàn bộ các ngày trong tháng đều có `status = 'future'`.

---

### 4.3. Tổng hợp Chỉ số Tháng & Phòng Chống Lỗi Chia Cho 0 ($\text{NaN}\%$)

- $N_{\text{pass}}$: Tổng số ngày có `status === 'pass' || status === 'no_spend'`.
- $N_{\text{fail}}$: Tổng số ngày có `status === 'fail'`.

#### Công thức Tỷ lệ thành công (Success Rate):
$$\text{Success Rate} = \begin{cases} \text{round}\left(\frac{N_{\text{pass}}}{N_{\text{elapsed}}} \times 100\right)\%, & \text{khi } N_{\text{elapsed}} > 0 \\ 0\%, & \text{khi } N_{\text{elapsed}} = 0 \text{ (Tháng tương lai - Hiển thị: 'Chưa bắt đầu')} \end{cases}$$

#### So sánh Kỳ vọng Lũy kế đến Hiện tại (Month-to-Date):
- **Kỳ vọng đến nay:** $\text{Expected}_{\text{MTD}} = \text{daily\_limit} \times N_{\text{elapsed}}$.
- **Thực tế đã chi:** $\text{Actual}_{\text{MTD}} = \sum_{d=1}^{N_{\text{elapsed}}} \text{spent}(d)$.
- **Chênh lệch:** $\text{Diff} = \text{Expected}_{\text{MTD}} - \text{Actual}_{\text{MTD}}$.
  - Nếu $\text{Diff} \ge 0$: Đang chi tiêu **đúng kỳ vọng** (Tiết kiệm $+\text{Diff}$ đ).
  - Nếu $\text{Diff} < 0$: Đang chi tiêu **vượt quá kỳ vọng** (Lạm chi $-|\text{Diff}|$ đ).

#### Ngân sách & Hạn mức gợi ý cho các ngày còn lại:
- Số ngày còn lại: $N_{\text{remaining}} = N_{\text{total\_days}} - N_{\text{elapsed}}$.
- Tổng ngân sách trần tháng: $\text{Budget}_{\text{Total}} = \text{daily\_limit} \times N_{\text{total\_days}}$.
- Ngân sách khả dụng còn lại: $\text{Budget}_{\text{Remaining}} = \max(0, \text{Budget}_{\text{Total}} - \text{Actual}_{\text{MTD}})$.
- Hạn mức gợi ý trung bình mỗi ngày:
  $$\text{Daily Suggested} = \begin{cases} \text{round}\left(\frac{\text{Budget}_{\text{Remaining}}}{N_{\text{remaining}}}\right), & \text{khi } N_{\text{remaining}} > 0 \\ 0, & \text{khi } N_{\text{remaining}} = 0 \text{ (Tháng đã kết thúc)} \end{cases}$$

---

## 5. Thiết Kế Giao Diện & Trải Nghiệm Người Dùng (UI/UX Architecture)

### 5.1. Cấu trúc Thư Mục & Điều Hướng
Toàn bộ mã nguồn đặt chuẩn trong thư mục `yoogi-money-tracker/src/`:
- **Trang mới:** `yoogi-money-tracker/src/pages/DailyDisciplinePage.jsx`.
- **Hook mới:** `yoogi-money-tracker/src/hooks/useDailyDiscipline.js`.
- **Service đồng bộ:** `yoogi-money-tracker/src/services/dailyBudgetService.js` (fetch, save, realtime subscribe).
- **Components:** `yoogi-money-tracker/src/components/daily-discipline/`:
  - `DailyDisciplineHeader.jsx`: Chuyển tháng (`< Tháng MM/YYYY >`) và nút Cài đặt.
  - `MonthlySummaryCard.jsx`: Thẻ thống kê 3 KPI (Đạt, Vượt, %), Thanh đo thực tế vs kỳ vọng, Banner gợi ý ngày còn lại.
  - `DisciplineCalendarGrid.jsx`: Lưới lịch 7 cột (Thứ 2 đến Chủ nhật).
  - `DayCellItem.jsx`: Ô hiển thị từng ngày (Số ngày, Số tiền, Badge trạng thái).
  - `DayDetailsModal.jsx`: Modal xem chi tiết ngày.
  - `DailyBudgetConfigModal.jsx`: Modal cấu hình hạn mức & chọn danh mục.

### 5.2. Điều Hướng Menu (Navigation Bar)
Trong `yoogi-money-tracker/src/components/Layout.jsx`:
- Thêm item vào mảng `NAV_ITEMS`:
  ```javascript
  { id: 'daily-discipline', label: 'Kỷ luật', icon: CalendarCheck }
  ```
- **Tối ưu Mobile:** Đặt nhãn ngắn gọn là `"Kỷ luật"` (kèm icon `CalendarCheck` từ `lucide-react`) để đảm bảo thanh Tab Bar 6 mục hiển thị vừa vặn, không bị vỡ hàng hay che khuất trên màn hình điện thoại (từ 360px trở lên).

### 5.3. Tái Sử Dụng Modal Thêm Giao Dịch
- Trong `DayDetailsModal.jsx`, khi người dùng bấm nút **"+ Thêm nhanh giao dịch"**, component sẽ tái sử dụng `TransactionModal` sẵn có của hệ thống và truyền `initialDate = selectedDay` cùng danh mục được chọn sẵn. Không tạo form nhập liệu trùng lặp.
- Hỗ trợ hiển thị mục thu gọn: *"Các khoản chi khác trong ngày không tính vào hạn mức"* (ví dụ: Tiền điện, Tiền trọ...) để người dùng có cái nhìn đầy đủ nếu muốn kiểm tra.

---

## 6. Xử Lý Các Trường Hợp Biên (Edge Cases & Safety)

1. **Category bị xóa hoặc sửa:**
   - Nếu danh mục đang được theo dõi bị xóa khỏi hệ thống, hook tự động loại bỏ ID rác khỏi bộ nhớ mà không gây crash trang.
2. **Thao tác chuyển tháng:**
   - Hỗ trợ xem các tháng trong quá khứ hoặc tương lai; các công thức tự động thích ứng với số ngày đã qua ($N_{\text{elapsed}}$) mà không bị lỗi NaN.
3. **Múi giờ (Timezone Drift):**
   - Tuyệt đối không dùng `Date.prototype.toISOString()` để trích xuất ngày. Luôn dùng định dạng chuỗi `YYYY-MM-DD` địa phương từ transaction để đảm bảo các giao dịch vào ban đêm (23:45) không bị trôi sang ngày hôm sau.

---

## 7. Kế Hoạch Kiểm Thử & Nghiệm Thu (Verification & Testing)

1. **Kiểm thử Logic (Unit Tests):**
   - Viết test case cho `useDailyDiscipline`:
     - Test loại bỏ giao dịch `income`, `transfer`, `debt`.
     - Test loại bỏ giao dịch chi tiêu không thuộc danh mục chọn (ví dụ: tiền điện 1.2M bị bỏ qua, chỉ tính tiền ăn uống).
     - Test 3 ngữ cảnh: Tháng quá khứ, Tháng hiện tại, Tháng tương lai.
2. **Kiểm thử Giao Diện & Tương Tác:**
   - Kiểm tra click chọn ngày mở đúng modal chi tiết ngày.
   - Thêm giao dịch mới $\rightarrow$ Ô lịch lập tức đổi màu và nhảy số tiền Realtime.
3. **Kiểm thử Đóng Gói (Capacitor Android):**
   - Chạy `npm run build` đảm bảo không có lỗi biên dịch.
   - Kiểm tra layout trên giao diện Android responsive.

---

## 8. Lộ Trình Triển Khai Tiếp Theo
1. Chạy vòng lặp Spec Reviewer để duyệt tài liệu thiết kế.
2. Xin xác nhận của người dùng.
3. Kích hoạt skill `writing-plans` để chia nhỏ task và tiến hành lập trình.