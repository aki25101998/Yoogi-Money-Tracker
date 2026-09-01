# Project Rules - Yoogi Money Tracker

## Auto Deploy Rule

**BẮT BUỘC**: Sau khi hoàn thành bất kỳ thay đổi code nào (fix bug, thêm feature, sửa UI...), LUÔN LUÔN tự động thực hiện backup và deploy theo các bước sau:

1. Cấu hình Git (nếu chưa):
```powershell
git config user.name "aki25101998"
git config user.email "aki251098@gmail.com"
```

2. Commit và push lên GitHub:
```powershell
git add .
git commit -m "<mô tả ngắn gọn thay đổi>"
git push
```

Vercel sẽ tự động deploy khi nhận push từ GitHub.

**LƯU Ý**: 
- Commit message phải mô tả rõ thay đổi (tiếng Việt hoặc Anh đều được)
- Không cần hỏi user trước khi push, hãy tự động làm
- Nếu push bị lỗi, thông báo cho user

## Android APK Build Rule

Dự án này sử dụng Capacitor 8 để đóng gói Android. Nó **bắt buộc** phải có Java 21 và Android SDK.
Vì máy của user không cài đặt sẵn môi trường Java và Android SDK trên hệ thống, tuyệt đối KHÔNG tự ý chạy `gradlew assembleDebug` một cách đơn độc.

Để xuất file APK, luôn luôn sử dụng quy trình /export-apk (hoặc chạy script `build_apk.ps1` ở thư mục gốc).
