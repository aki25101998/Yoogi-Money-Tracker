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

## APK Update Rule

**BẮT BUỘC**: Nếu những thay đổi bạn thực hiện (ví dụ: sửa code Javascript, React, đổi Logic ứng dụng, thay đổi giao diện, thêm thư viện v.v...) yêu cầu người dùng phải cập nhật lại Ứng dụng điện thoại (Android APK) để có tác dụng, bạn LUÔN LUÔN phải tự động thông báo cho người dùng biết rằng họ CẦN PHẢI cài đặt lại app.

Khi thông báo, hãy giải thích ngắn gọn nguyên nhân (ví dụ: vì bạn đã sửa file .js/.jsx nên mã nguồn đóng gói trên APK cần được tạo lại).
