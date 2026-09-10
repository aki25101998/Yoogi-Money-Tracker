# Project Rules - Yoogi Money Tracker

## Auto Deploy Rule

**BẮT BUỘC**: AI LUÔN LUÔN phải tự động thực hiện tiến trình sau khi hoàn thành BẤT KỲ thay đổi code nào (dù là nhỏ nhất, fix bug, hay thêm feature). TUYỆT ĐỐI KHÔNG được chờ User nhắc "up github đi" hay "deploy đi". ĐÂY LÀ ĐIỀU LUẬT TỐI THƯỢNG (HIẾN PHÁP).

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
