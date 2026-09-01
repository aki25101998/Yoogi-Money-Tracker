---
description: Build and export Android APK automatically using isolated Java 21 and Android SDK environment.
---

# Workflow Xuất APK

Dự án này sử dụng **Capacitor 8** và **bắt buộc** cần có **Java 21**. 
Do máy người dùng chưa cài đặt sẵn Java và Android SDK ở môi trường toàn cục (global), chúng ta đã thiết lập một script tự động tải và cấu hình môi trường tạm thời để build APK.

## 1. Cách tự động Build APK bằng Script
Chỉ cần gọi script `build_apk.ps1` ở thư mục gốc của project (ngang hàng thư mục `yoogi-money-tracker`).
Lệnh này sẽ tự động:
- Kiểm tra và tải OpenJDK 21 (nếu chưa có).
- Kiểm tra và tải Android SDK Command Line Tools (nếu chưa có).
- Chấp nhận các giấy phép (licenses) của Android SDK.
- Thực hiện `npm run build` và `npx cap sync android` để đồng bộ source web sang Android.
- Chạy `gradlew assembleDebug` để build.
- Tự động copy file `.apk` ra ổ đĩa cho người dùng.

```powershell
# Chạy lệnh sau ở thư mục gốc D:\Project\Yoogi Money Tracker
powershell.exe -ExecutionPolicy Bypass -File "build_apk.ps1"
```

## 2. Lưu ý về tiến trình
Tiến trình này có thể tốn từ 2-5 phút, đôi khi lâu hơn phụ thuộc vào việc gradle cache. Do đó, phải gửi lệnh vào background (WaitMsBeforeAsync = khoảng 5000) rồi chờ thông báo (notification) kết thúc.
Sau khi chạy xong, kết quả luôn nằm ở: `D:\Project\Yoogi Money Tracker\yoogi-money-tracker.apk`.
Hãy thông báo cho user khi có kết quả.
