# Project Rules - Yoogi Money Tracker

Dự án Yoogi Money Tracker áp dụng một "Hiến pháp" (Constitution) rất nghiêm ngặt để đảm bảo an toàn dữ liệu và tính ổn định. 

> **QUAN TRỌNG:** Toàn bộ chi tiết về Hiến pháp (Kiến trúc ứng dụng, quy tắc viết Atomic RPC, quy định UX/UI, và các hành vi bị nghiêm cấm) đều đã được chia nhỏ và đặt trong thư mục `.agents/rules/`. Các AI Agent sẽ tự động đọc các luật này trước khi thực thi bất cứ tác vụ nào.

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
