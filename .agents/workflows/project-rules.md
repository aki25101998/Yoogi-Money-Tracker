---
description: Bộ quy tắc chuẩn, liệt kê kiến trúc core và các điều bắt buộc tuân thủ khi code web Yoogi Money Tracker. Bắt buộc AI phải đọc trước khi sửa code.
---

# Yoogi Money Tracker - Bộ Quy Tắc Chuẩn & Kiến Trúc Core (Core Rulebook)

> [!IMPORTANT]
> **Dành cho AI & Developer:** Bạn BẮT BUỘC phải đọc kỹ tài liệu này trước khi tiến hành viết code, refactor hay thêm tính năng mới cho dự án. Mọi thay đổi đều không được phép phá vỡ các quy tắc và logic cốt lõi đã được định nghĩa tại đây.

## 1. Tổng quan dự án (Overview)
- **Tên dự án:** Yoogi Money Tracker
- **Ngôn ngữ & Framework:** React (Vite), Tailwind CSS, Vite PWA.
- **Nền tảng (Platform):** Web App (PWA) & Mobile App (Android thông qua Capacitor). App Android trỏ thẳng về Web URL (Vercel) để đồng bộ tự động.
- **Backend & Database:** Supabase (PostgreSQL), xác thực qua Supabase Auth và Capacitor Google Auth plugin. Dữ liệu được bảo vệ bằng Row Level Security (RLS).
- **Mục tiêu:** Quản lý tài chính cá nhân toàn diện với sự hỗ trợ của AI (tự động phân loại, ghi nhớ thông minh), hỗ trợ quản lý ví, nợ, trả góp và giao dịch định kỳ.
- **Database Scripts:** Hỗ trợ lệnh npm run backup-db và restore-db thông qua Node.js để thao tác dữ liệu thủ công.

## 2. Kiến trúc Dữ liệu & Logic Cốt lõi (BẮT BUỘC GIỮ NGUYÊN)

### 2.1. Quản lý Giao dịch (Transactions)
- **Logic cốt lõi:** Mọi thu/chi/chuyển tiền/vay mượn đều được quy về một `transaction` duy nhất.
- **Phân loại `type`:** 
  - `expense`: Chi phí.
  - `income`: Thu nhập.
  - `transfer`: Chuyển tiền nội bộ giữa các ví.
  - `loan_given`: Cho mượn tiền (tạo công nợ).
  - `loan_repaid`: Người mượn trả tiền.
- **Rule Bắt buộc:** Không lưu cứng "số dư thực tế" (current balance) của ví vào database. Số dư của ví luôn được **tính toán on-the-fly (real-time)** ở frontend dựa trên `initial_balance` của ví cộng/trừ đi tất cả các `transactions` tương ứng.
- **Lưu ý đặc biệt khi chuyển đổi dữ liệu (Mapping):** Bắt buộc liên kết danh mục (`category_id`) bằng tên và kiểu dữ liệu chuẩn, liên kết ví đích (`to_wallet_id`) để tránh lỗi mất ví khi chuyển khoản.

### 2.2. Quản lý Ví (Wallets)
- **Cấu trúc:** Mỗi ví có `id`, `name`, `icon`, `initial_balance`, `order` (để kéo thả thứ tự).
- **Rule Bắt buộc:** Khi thêm/sửa/xóa một giao dịch, số dư ví sẽ tự động nhảy. 

### 2.3. Sổ Nợ (Debts) & Trả Góp (Installments)
> [!CAUTION]
> Tuyệt đối KHÔNG được gộp chung danh sách người mượn nợ và người trả góp. Đây là 2 thực thể độc lập phục vụ 2 luồng logic khác nhau.

- **Người mượn nợ (Debtors / Lenders):**
  - Collection: `debtors` và `lenders`.
  - Phục vụ cho tính năng **Sổ Nợ** (DebtsPage).
  - Mỗi người mượn có thể có nhiều khoản nợ. Khoản nợ lưu ở bảng `debts`.
  - **Quy tắc cốt lõi về tính toán nợ:** Database Supabase chỉ lưu `amount` (tổng tiền) và `remaining_amount` (số tiền còn nợ). Front-end **bắt buộc** phải tự suy ra `repaidAmount` bằng công thức: `repaidAmount = amount - remaining_amount`.
  - Khi người dùng trả nợ (thêm transaction `loan_repaid`), hệ thống sẽ trừ trực tiếp vào `remaining_amount` và tự động đổi `status` thành `paid` nếu `remaining_amount <= 0`.
  
- **Người trả góp (Payers / Installments):**
  - Bảng: `payers` và `installments`.
  - Phục vụ cho tính năng **Trả Góp** (InstallmentsPage).
  - Các hợp đồng trả góp có kỳ hạn (mua cho mình hoặc mua giùm người khác).
  - **Rule Bắt buộc về đồng bộ giao dịch:** Khi đóng tiền trả góp, hệ thống sẽ tạo một transaction. Vì người dùng có thể đóng trễ (VD: đóng kỳ tháng 6 vào tháng 7), `date` của transaction KHÔNG đại diện cho kỳ hạn. Do đó, **bắt buộc** phải chèn tháng kỳ hạn vào mô tả giao dịch theo cú pháp `(TMM/YYYY)` (ví dụ: `(T06/2026)`).
  - Khi xoá giao dịch trả góp (bất kể là xóa từ Sổ giao dịch hay hoàn tác ở tab Đã xong), hệ thống phải bóc tách Regex từ `description` giao dịch để tìm ra chính xác kỳ hạn đã đóng, từ đó loại bỏ kỳ hạn này khỏi mảng `paid_months` của bảng `installments`. (Liên kết 2 chiều).

### 2.4. Trợ lý AI (AI Categorizer) & AI Memory
- **Luồng xử lý (Flow):** 
  1. Trích xuất Text -> `{ description, amount }`.
  2. Tra cứu `ai_memory`: Nếu mô tả trùng khớp với trí nhớ AI -> Tự động gắn Category không cần gọi Gemini.
  3. Nếu không có trong Memory -> Gọi Gemini API (2.5 Flash) để phân tích ngữ cảnh.
- **AI Memory (Học máy cá nhân hóa):**
  - Khi người dùng sửa category của một giao dịch do AI phân loại sai, hệ thống BẮT BUỘC phải gọi hàm tương ứng để lưu/cập nhật quy tắc vào `ai_memory`.

### 2.5. Giao dịch định kỳ (Recurring Transactions)
- **Logic hoạt động:**
  - Được lưu tại bảng `recurring_transactions`.
  - Hàm `setInterval` chạy ngầm mỗi 30 giây trong `App.jsx` để kiểm tra các giao dịch tới hạn (`next_date <= now`).
  - Khi tới hạn: Tự động push 1 `transaction` mới vào database -> Tính lại `next_date` tiếp theo -> Lưu lại cập nhật.
- **Rule Bắt buộc:** Không được xóa bỏ logic quét 30s này. Phải luôn bao gồm xử lý "bù giờ" (catch-up) nếu app bị tắt trong thời gian dài (vòng lặp while cho `next_date <= now`).

### 2.6. Thẻ tín dụng (Credit Cards) & Tính năng Trả Tối Thiểu (Minimum Payment)
- **Logic hoạt động:** Đối với thẻ tín dụng hoặc các khoản nợ có tính năng thanh toán số dư tối thiểu, hệ thống phải xử lý tách bạch giữa [Số tiền trả tối thiểu] và [Dư nợ còn lại]. Bất kỳ giao dịch trả tối thiểu nào cũng phải được hạch toán chính xác vào dư nợ và cập nhật trạng thái hiển thị hợp lý.

### 2.7. Tối ưu trải nghiệm nhập liệu (Quick Suggestions)
- **Quy tắc:** Tại giao diện thêm/sửa giao dịch, mục mô tả (description) cần có các nút gợi ý văn bản nhanh (Ví dụ: "Nạp vào ATM", "Rút tiền mặt"...) dựa trên loại giao dịch và ngữ cảnh, giúp người dùng thao tác nhanh nhất trên màn hình điện thoại.

---

## 3. Quy tắc Lập trình (Coding Guidelines)

### 3.1. Supabase Database & Realtime 
- **Row Level Security (RLS):** BẮT BUỘC phải truyền `user_id = auth.uid()` vào các câu lệnh Insert/Update. Tất cả các bảng đều phải bật RLS.
- **Nguyên tắc Read/Write & Realtime:** 
  - Khuyến khích sử dụng `supabase.channel` để Subscribe Realtime các bảng quan trọng (transactions, wallets, categories).
  - BẮT BUỘC: Do kiến trúc hiện tại, sau khi gọi hàm Insert/Update/Delete (ví dụ `addTransaction`, `deleteDebt`), bạn **PHẢI** gọi `window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: '<table_name>' }));` để kích hoạt việc tải lại dữ liệu trên giao diện ngay lập tức. Nếu bỏ quên, người dùng sẽ phải F5 mới thấy dữ liệu đổi.

### 3.2. Cấu trúc Component React
- **Tách biệt Logic và UI:** Đưa các hàm gọi Supabase vào file riêng (như `supabaseHelpers.js`). Component chỉ gọi hàm, quản lý State và Render.
- **Xóa Dữ Liệu Có Khóa Ngoại (Foreign Keys):** Do schema hiện tại của Supabase không sử dụng `ON DELETE CASCADE` ở nhiều bảng (ví dụ `ai_chat_history`, `transactions` trỏ tới `wallets` hoặc `payers`), trước khi xóa một `wallet` hay `payer`, **BẮT BUỘC** phải xử lý thủ công bằng cách xóa hoặc set `null` các bản ghi tham chiếu tới nó (ví dụ: set `wallet_id = null` cho giao dịch, xóa `ai_chat_history` của ví đó).
- **Tránh Render lại không cần thiết:** Với các dữ liệu phức tạp (như tính tổng số dư ví, nhóm các giao dịch, thống kê biểu đồ), bắt buộc phải dùng `useMemo`.
- **Prop Drilling:** Đối với các Modal Global (như `AIChatModal`, `TransactionModal`), nên được đặt ở tầng cao nhất có thể (VD: Layout hoặc App) và truyền props xuống.

### 3.3. UI / UX Design
- **Dark/Light Mode:** Bắt buộc hỗ trợ song song. Sử dụng class `dark:` của Tailwind.
- **Màu sắc chủ đạo:** `emerald`, `teal`, `cyan` cho cảm giác tài chính an toàn. `rose` cho chi phí, `amber`/`orange` cho cảnh báo hoặc nợ. KHÔNG dùng màu gốc (red/green) quá chói.
- **Micro-interactions:** Bắt buộc dùng `transition-all`, `hover:`, `active:scale-95` cho các nút bấm để tạo cảm giác mượt mà (Glassmorphism, bóng đổ shadow-lg).

### 3.4. Auto-Deploy & Workflow (QUY TẮC BẮT BUỘC)
- **Kiến trúc Hosting & Native App:** Frontend được host trên **Vercel**, tự động deploy mỗi khi code được push lên nhánh master trên GitHub. Backend và Database nằm trên **Supabase**. Bản Android APK được build qua **Capacitor** nhưng cấu hình trỏ thẳng URL về Vercel (`capacitor.config.json`) nên Android App sẽ tự động nhận cập nhật mới nhất từ Vercel mà không cần build lại APK (trừ khi cập nhật native plugin).
- **Xác thực (Auth):** Sử dụng plugin `@codetrix-studio/capacitor-google-auth` cho môi trường Capacitor Native. Cần đặc biệt lưu ý luồng đăng nhập phải hỗ trợ tốt cả Web và Android.
- **Cấu hình Git bắt buộc:** Để Vercel không chặn (Block) tiến trình deploy tự động (do tính năng Deployment Protection), tài khoản Git thực hiện commit **BẮT BUỘC** phải khớp với email của dự án:
  - Tên: `aki25101998`
  - Email: `aki251098@gmail.com` (Tuyệt đối KHÔNG dùng email ẩn danh dạng `noreply.github.com`).
- **Quy tắc Deploy:** Mọi thay đổi về code sau khi hoàn thành (hoặc sau mỗi tác vụ User yêu cầu) BẮT BUỘC AI phải tự động thực hiện quy trình đẩy code lên GitHub (`git add .`, `git commit`, `git push`) để Vercel tự động build mà KHÔNG CẦN User phải nhắc nhở.
- **Quy tắc Kiểm thử (Testing):** Mọi logic quan trọng (như thay đổi cách tính số dư, nợ) phải được verify qua Vitest (`npm run test`) trước khi được phép deploy.
- **Xử lý sự cố Vercel:** Nếu đẩy code lên GitHub thành công nhưng Vercel báo lỗi thư mục quá lớn (`Too many files`) khi chạy thủ công, hãy đảm bảo đã cấu hình file `.vercelignore` chặn `node_modules`, `android-sdk`, `jdk-*`, `.git`, v.v. Nếu Vercel báo `Blocked`, cần kiểm tra lại ngay thông tin email trong Git Config.


## 4. Những điều CẤM (Anti-patterns)
1. **KHÔNG** quên `dispatchEvent('supabase_mutate')` khi thay đổi dữ liệu.
2. **KHÔNG** tính toán sai `remaining_amount` của Debts. Dữ liệu trả về từ Supabase chỉ có `amount` và `remaining_amount`, `repaidAmount` phải do frontend tự suy ra.
3. **KHÔNG** xóa bỏ các danh mục mặc định (Uncategorized, Transfer).
4. **KHÔNG** gộp chung Người mượn (Debtors) và Người trả góp (Payers) trong xử lý dữ liệu và giao diện.
5. **KHÔNG** sử dụng `cat` trong bash command để tạo hay sửa file. Luôn dùng các công cụ thay thế văn bản chuẩn.
6. **KHÔNG** xóa toàn bộ bảng dữ liệu (`DROP TABLE`) hay chạy lại `schema_v2.sql` khi chỉ cần thêm cột (dùng `ALTER TABLE`). Việc này sẽ gây mất trắng dữ liệu hiện tại của người dùng.
7. **KHÔNG** Migrate dữ liệu (như Categories) vào Supabase mà không kiểm tra và dọn dẹp các dữ liệu mặc định (do Supabase auto-gen khi tạo user mới) để tránh bị trùng lặp (Duplicate Data).
8. **KHÔNG** Migrate dữ liệu mà không đối chiếu kỹ Data Schema. Cần đảm bảo các trường dữ liệu (fields) quan trọng như khóa ngoại được mapping chính xác (VD: trong phiên bản cũ là `transferTo`, khi qua Supabase phải map đúng vào `to_wallet_id`). Việc map sai hoặc sót sẽ làm gãy liên kết dữ liệu và làm sai số dư.
9. **KHÔNG** để giao dịch tham chiếu đến một `category_id` không tồn tại. Khi migrate hoặc xóa danh mục, bắt buộc phải re-map giao dịch sang danh mục khác. Nếu không, giao dịch sẽ bị hiển thị là "Chưa phân loại" trên UI và mất ngữ cảnh.
10. **KHÔNG** code tràn lan trong một file. Giữ file dưới 1000 dòng.
11. **KHÔNG** gọi sự kiện (ví dụ: `onClick`) trên một Component dùng chung (ví dụ: `<Card>`) mà chưa kiểm tra xem Component đó có được định nghĩa để rải (spread) `...props` xuống thẻ gốc HTML hay không. Việc này sẽ khiến các sự kiện bị "nuốt" và không được thực thi.
12. **KHÔNG** sửa đổi các file cấu hình quan trọng nếu không có yêu cầu cực kỳ đặc biệt (Files Blacklist): `capacitor.config.json`, `package-lock.json`, `.env`. Chỉ thêm package qua `npm install` thay vì sửa `package.json` bằng tay.

---
*Tài liệu này được tạo ra để AI lấy làm gốc rễ tham chiếu. Trong mọi yêu cầu refactor, fix bug hay add feature, quy tắc tại đây là tối cao.*
