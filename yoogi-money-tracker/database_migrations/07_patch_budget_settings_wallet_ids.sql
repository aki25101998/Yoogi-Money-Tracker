-- 1. Thêm cột wallet_ids vào bảng budget_settings (dạng mảng các text/uuid) để hỗ trợ tính năng chọn ví áp dụng ngân quỹ
ALTER TABLE budget_settings ADD COLUMN wallet_ids text[] DEFAULT '{}';
