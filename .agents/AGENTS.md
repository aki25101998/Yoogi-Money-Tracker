# Project Rules - Yoogi Money Tracker

Dự án Yoogi Money Tracker áp dụng một "Hiến pháp" (Constitution) rất nghiêm ngặt để đảm bảo an toàn dữ liệu và tính ổn định. 

> **QUAN TRỌNG:** Toàn bộ chi tiết về Hiến pháp đã được chia nhỏ thành 9 phân hệ chuyên sâu trong thư mục `.agents/rules/`. Các AI Agent BẮT BUỘC phải đọc và tuân thủ các luật này trước khi thực thi bất cứ tác vụ nào:
> 1. `01-architecture.md`: Tổng quan kiến trúc lõi, 6 Transaction Types, State Management & Realtime Sync.
> 2. `02-database-rpc.md`: Cơ sở dữ liệu Supabase, RLS, Quy chuẩn Atomic RPC, Xử lý JSONB an toàn, Khóa hàng chống Race Condition (`FOR UPDATE`), Idempotency.
> 3. `03-installments.md`: Nghiệp vụ Trả Góp (Installments), `paid_months`, `partial_payments`, RPC `update_installment_payment_atomic`, RPC `process_bulk_installment_payment`, Idempotency key, Reversal/Diff bù trừ.
> 4. `04-debts.md`: Nghiệp vụ Sổ Nợ (Debts & Loans), Quy tắc số học (`repaidAmount = amount - remaining_amount`), RPC `mark_debt_paid_atomic`, RPC `update_debt_repayment_atomic`, Phân tách Component.
> 5. `05-budgets.md`: Nghiệp vụ Ngân Quỹ & Thu Nhập Cơ Sở (Base Income), Portfolios, Thuật toán Bù trừ chéo (Cross-budgeting), Đồng bộ modal giao dịch.
> 6. `06-wallets-transactions.md`: Quản lý Ví & Giao Dịch, Công thức tính số dư ví On-the-fly, RPC `delete_wallet_safely`, Bảo vệ danh mục hệ thống.
> 7. `07-ai-and-automation.md`: Bộ nhớ AI (`ai_memory`, `learnFromCorrection`), Giao dịch định kỳ (`recurring_transactions` catch-up loop), Sao lưu & Khôi phục nguyên khối (`version_history`).
> 8. `08-ui-ux.md`: Giao diện React, Phân cấp Z-Index cho Modal (`z-50` đến `z-[100]`), Chống Event Bubbling (`pointer-events-none`), Tối ưu Mobile (Capacitor Android).
> 9. `09-anti-patterns.md`: Bảng 12 Lệnh CẤM Tuyệt Đối phòng chống 100% rủi ro hỏng logic và mất mát dữ liệu.

## Auto Deploy Rule (LUẬT TỐI THƯỢNG)

**BẮT BUỘC**: AI LUÔN LUÔN phải tự động thực hiện tiến trình sau khi hoàn thành BẤT KỲ thay đổi code nào (dù là nhỏ nhất, fix bug, hay thêm feature). TUYỆT ĐỐI KHÔNG được chờ User nhắc "up github đi" hay "deploy đi". 

1. Chạy Build để đảm bảo không có lỗi:
```powershell
npm run build
```

2. Cấu hình Git (nếu chưa):
```powershell
git config user.name "aki25101998"
git config user.email "aki251098@gmail.com"
```

3. Commit và push lên GitHub:
```powershell
git add .
git commit -m "<mô tả ngắn gọn thay đổi>"
git push
```

Vercel sẽ tự động deploy khi nhận push từ GitHub.

**LƯU Ý**: 
- KHÔNG CẦN HỎI HAY XIN PHÉP user trước khi push, hãy TỰ ĐỘNG làm ngay trong lượt phản hồi.
- Commit message phải mô tả rõ thay đổi.
- Nếu push bị lỗi, thông báo cho user.

## Android APK Build Rule

Dự án này sử dụng Capacitor 8 để đóng gói Android. Nó **bắt buộc** phải có Java 21 và Android SDK.
Vì máy của user không cài đặt sẵn môi trường Java và Android SDK trên hệ thống, tuyệt đối KHÔNG tự ý chạy `gradlew assembleDebug` một cách đơn độc.

Để xuất file APK, luôn luôn sử dụng quy trình /export-apk (hoặc chạy script `build_apk.ps1` ở thư mục gốc).
