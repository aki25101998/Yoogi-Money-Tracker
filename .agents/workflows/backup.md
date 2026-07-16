---
description: Tự động backup (git commit + push GitHub) và Deploy lên Vercel
---

// turbo-all

## Trước khi sửa code / Khi cần sao lưu

1. Đảm bảo cấu hình Git đúng (RẤT QUAN TRỌNG ĐỂ VERCEL KHÔNG BLOCK)
```powershell
git config user.name "aki25101998"
git config user.email "aki251098@gmail.com"
```

2. Backup dữ liệu Database, lưu toàn bộ thay đổi và đẩy lên GitHub (Vercel sẽ tự động deploy)
```powershell
cd yoogi-money-tracker
npm run backup-db
cd ..
git add .
git commit -m "Auto-backup code"
git push
```

## Khắc phục sự cố Deploy

3. Nếu Vercel bị kẹt, có thể ép deploy thủ công từ máy tính (Yêu cầu phải có .vercelignore ở thư mục gốc)
```powershell
npx vercel --prod --yes
```

## Khi user muốn quay lại bản trước

4. Xem lịch sử
```powershell
git log --oneline -10
```

5. Hoàn tác commit cuối (hoặc checkout về commit cũ) và phục hồi lại Database
```powershell
git revert HEAD --no-edit
# Sau khi lấy code cũ về, chạy lệnh sau để phục hồi Database
cd yoogi-money-tracker
npm run restore-db
cd ..
git push
```
