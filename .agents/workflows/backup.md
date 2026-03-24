---
description: Tự động backup (git commit + push GitHub) và Deploy lên Firebase
---

// turbo-all

## Trước khi sửa code / Khi cần sao lưu

1. Lưu toàn bộ thay đổi và đẩy lên GitHub
```powershell
git add .
git commit -m "Auto-backup code"
git push
```

## Khi sửa code xong hoặc muốn Deploy

2. Build source code
```powershell
cd quan-ly-tra-gop
npm run build
```

3. Deploy lên Firebase
```powershell
cd quan-ly-tra-gop
npx firebase-tools deploy
```

## Khi user muốn quay lại bản trước

4. Xem lịch sử
```powershell
git log --oneline -10
```

5. Hoàn tác commit cuối
```powershell
git revert HEAD --no-edit
git push
```
