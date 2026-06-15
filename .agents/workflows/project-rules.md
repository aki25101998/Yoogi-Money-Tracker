---
description: Bộ quy tắc chuẩn, liệt kê kiến trúc core và các điều bắt buộc tuân thủ khi code web Yoogi Money Tracker. Bắt buộc AI phải đọc trước khi sửa code.
---

# Yoogi Money Tracker - Bộ Quy Tắc Chuẩn & Kiến Trúc Core (Core Rulebook)

> [!IMPORTANT]
> **Dành cho AI & Developer:** Bạn BẮT BUỘC phải đọc kỹ tài liệu này trước khi tiến hành viết code, refactor hay thêm tính năng mới cho dự án. Mọi thay đổi đều không được phép phá vỡ các quy tắc và logic cốt lõi đã được định nghĩa tại đây.

## 1. Tổng quan dự án (Overview)
- **Tên dự án:** Yoogi Money Tracker
- **Ngôn ngữ & Framework:** React (Vite), Tailwind CSS.
- **Backend & Database:** Firebase (Auth: Google, Firestore: NoSQL Database).
- **Mục tiêu:** Quản lý tài chính cá nhân toàn diện với sự hỗ trợ của AI (tự động phân loại, ghi nhớ thông minh), hỗ trợ quản lý ví, nợ, trả góp và giao dịch định kỳ.

## 2. Kiến trúc Dữ liệu & Logic Cốt lõi (BẮT BUỘC GIỮ NGUYÊN)

### 2.1. Quản lý Giao dịch (Transactions)
- **Logic cốt lõi:** Mọi thu/chi/chuyển tiền/vay mượn đều được quy về một `transaction` duy nhất.
- **Phân loại `type`:** 
  - `expense`: Chi phí.
  - `income`: Thu nhập.
  - `transfer`: Chuyển tiền nội bộ giữa các ví.
  - `loan_given`: Cho mượn tiền (tạo công nợ).
  - `loan_repaid`: Người mượn trả tiền.
- **Rule Bắt buộc:** Không lưu cứng "số dư thực tế" (current balance) của ví vào database. Số dư của ví luôn được **tính toán on-the-fly (real-time)** ở frontend dựa trên `initialBalance` của ví cộng/trừ đi tất cả các `transactions` tương ứng.

### 2.2. Quản lý Ví (Wallets)
- **Cấu trúc:** Mỗi ví có `id`, `name`, `icon`, `initialBalance`, `order` (để kéo thả thứ tự).
- **Rule Bắt buộc:** Khi thêm/sửa/xóa một giao dịch, số dư ví sẽ tự động nhảy. Khi kéo thả đổi vị trí ví, phải cập nhật trường `order` trên Firestore bằng Batch Write.

### 2.3. Sổ Nợ (Debts) & Trả Góp (Installments)
> [!CAUTION]
> Tuyệt đối KHÔNG được gộp chung danh sách người mượn nợ và người trả góp. Đây là 2 thực thể độc lập phục vụ 2 luồng logic khác nhau.

- **Người mượn nợ (Debtors):**
  - Collection: `debtors`.
  - Phục vụ cho tính năng **Sổ Nợ** (DebtsPage).
  - Liên kết với `transaction` loại `loan_given` và `loan_repaid`.
  - Mỗi người mượn có thể có nhiều khoản nợ. Khoản nợ lưu ở collection `debts`. Tiến độ trả nợ được tính bằng tổng tiền đã nhận trả (`repaidAmount`) so với tổng tiền đã cho mượn (`totalAmount`).
- **Người trả góp (Payers):**
  - Collection: `payers`.
  - Phục vụ cho tính năng **Trả Góp** (InstallmentsPage).
  - Các hợp đồng trả góp có kỳ hạn (mua cho mình hoặc mua giùm người khác).

### 2.4. Trợ lý AI (AI Categorizer) & AI Memory
- **Luồng xử lý (Flow):** 
  1. Trích xuất Text -> `{ description, amount }`.
  2. Tra cứu `ai_memory`: Nếu mô tả trùng khớp với trí nhớ AI -> Tự động gắn Category không cần gọi Gemini.
  3. Nếu không có trong Memory -> Gọi Gemini API (2.5 Flash) để phân tích ngữ cảnh (nhận diện Category, Wallet, Debtor).
  4. Nếu Gemini không chắc chắn (< 0.5) -> Đưa vào "Chưa phân loại".
- **AI Memory (Học máy cá nhân hóa):**
  - Khi người dùng sửa category của một giao dịch do AI phân loại sai, hệ thống BẮT BUỘC phải gọi `learnFromCorrection` để lưu/cập nhật quy tắc vào `ai_memory`.
- **Bảo toàn Cấu trúc khi truyền cho AI:** 
  - Khi gọi AI, phải truyền rành mạch 2 danh sách `Payers` và `Debtors` để AI phân biệt. Khi nhận diện tên người dùng từ AI (để lưu `personName`), phải chuẩn hóa (Normalize) in hoa/in thường dựa trên danh sách `Debtors` có sẵn.

### 2.5. Giao dịch định kỳ (Recurring Transactions)
- **Logic hoạt động:**
  - Được lưu tại collection `recurring_transactions`.
  - Hàm `setInterval` chạy ngầm mỗi 30 giây trong `App.jsx` để kiểm tra các giao dịch tới hạn (`nextDate <= now`).
  - Khi tới hạn: Tự động push 1 `transaction` mới vào database -> Tính lại `nextDate` tiếp theo -> Lưu lại cập nhật.
- **Rule Bắt buộc:** Không được xóa bỏ logic quét 30s này. Phải luôn bao gồm xử lý "bù giờ" (catch-up) nếu app bị tắt trong thời gian dài (vòng lặp while cho `nextDate <= now`).

---

## 3. Quy tắc Lập trình (Coding Guidelines)

### 3.1. Firebase & Database
- **Collection cấp 1:** Dữ liệu LUÔN được đóng gói trong path: `artifacts/${APP_ID}/users/${user.uid}/<collection>`.
- **Nguyên tắc Read/Write:** 
  - Khuyến khích sử dụng `onSnapshot` (Real-time listener) để đồng bộ UI thay vì fetch thủ công `getDocs` (trừ khi cần fetch 1 lần như AI Memory lúc chat).
  - Phải check `!user` trước khi thực hiện bất kỳ thao tác read/write nào.
  - Các thao tác sửa xóa nhiều Document liên quan phải dùng `writeBatch(db)` để đảm bảo tính toàn vẹn dữ liệu.

### 3.2. Cấu trúc Component React
- **Tách biệt Logic và UI:** Đưa các hàm gọi Firebase vào file riêng (như `firebaseHelpers.js`). Component chỉ gọi hàm, quản lý State và Render.
- **Tránh Render lại không cần thiết:** Với các dữ liệu phức tạp (như tính tổng số dư ví, nhóm các giao dịch, thống kê biểu đồ), bắt buộc phải dùng `useMemo`.
- **Prop Drilling:** Đối với các Modal Global (như `AIChatModal`, `TransactionModal`), nên được đặt ở tầng cao nhất có thể (VD: Layout hoặc App) và truyền props xuống, tránh render lồng nhau dẫn đến lỗi z-index hoặc mất state.

### 3.3. UI / UX Design
- **Dark/Light Mode:** Bắt buộc hỗ trợ song song. Sử dụng class `dark:` của Tailwind cho mọi element có màu sắc. 
- **Màu sắc chủ đạo:** `emerald`, `teal`, `cyan` cho cảm giác tài chính an toàn. `rose` cho chi phí, `amber`/`orange` cho cảnh báo hoặc nợ. KHÔNG dùng màu gốc (red/green) quá chói.
- **Micro-interactions:** Bắt buộc dùng `transition-all`, `hover:`, `active:scale-95` cho các nút bấm để tạo cảm giác mượt mà (Glassmorphism, bóng đổ shadow-lg).
- **Responsive:** Mọi Modal, Chart, Layout BẮT BUỘC phải responsive tốt trên Mobile (dùng `sm:`, `md:`).

---

## 4. Những điều CẤM (Anti-patterns)
1. **KHÔNG** sửa cấu trúc DB hiện tại mà không migrate dữ liệu cũ. Việc thêm trường mới được cho phép, nhưng sửa tên/kiểu dữ liệu của trường cũ thì CẤM trừ khi có kịch bản đồng bộ.
2. **KHÔNG** xóa bỏ các danh mục mặc định (Uncategorized, Transfer). Nếu user xóa, hệ thống phải tự spawn lại.
3. **KHÔNG** gộp chung Người mượn (Debtors) và Người trả góp (Payers) trong xử lý dữ liệu và giao diện.
4. **KHÔNG** sử dụng `cat` trong bash command để tạo hay sửa file. Luôn dùng các công cụ thay thế văn bản chuẩn.
5. **KHÔNG** code tràn lan trong một file. Giữ file dưới 1000 dòng, nếu to quá phải tách component ra folder con.

---
*Tài liệu này được tạo ra để AI lấy làm gốc rễ tham chiếu. Trong mọi yêu cầu refactor, fix bug hay add feature, quy tắc tại đây là tối cao.*
