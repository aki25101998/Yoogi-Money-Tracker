-- 1. Thêm occurrence key
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS installment_payment_key TEXT;

-- 2. Populate installment_payment_key cho các transactions cũ thuộc loại trả góp 
-- (để tránh constraint violation & migrate an toàn)
UPDATE public.transactions
SET installment_payment_key = user_id::text || ':' || installment_id || ':' || 
    substring(substring(note from '\(T(\d{2}/\d{4})\)') from 4 for 4) || '-' || 
    substring(substring(note from '\(T(\d{2}/\d{4})\)') from 1 for 2)
WHERE type IN ('installment_repaid', 'loan_repaid')
  AND installment_id IS NOT NULL
  AND installment_payment_key IS NULL
  AND note LIKE '%(T__/____)%';

-- 3. Xóa các giao dịch bị duplicate cũ nhất (Legacy data cleansing)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, installment_payment_key 
               ORDER BY created_at ASC
           ) as rnum
    FROM public.transactions
    WHERE installment_payment_key IS NOT NULL
)
DELETE FROM public.transactions
WHERE id IN (
    SELECT id FROM duplicates WHERE rnum > 1
);

-- 4. Tạo unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS
transactions_installment_payment_unique
ON public.transactions (
    user_id,
    installment_payment_key
)
WHERE installment_payment_key IS NOT NULL;


-- 5. Sửa RPC quá trình xử lý Bulk Installment
CREATE OR REPLACE FUNCTION public.process_bulk_installment_payment(
    p_user_id UUID,
    p_wallet_id TEXT,
    p_payment_batch_id TEXT,
    p_date TIMESTAMP WITH TIME ZONE,
    p_items JSONB
) RETURNS JSONB AS $$
DECLARE
    item JSONB;
    v_installment_id TEXT;
    v_month_str TEXT;
    v_amount NUMERIC;
    v_description TEXT;
    v_category_id TEXT;
    v_subcategory_id TEXT;
    v_is_paying BOOLEAN;
    v_transaction_type TEXT;
    
    v_installment_record RECORD;
    v_payment_key TEXT;
    v_already_processed BOOLEAN := false;
BEGIN
    -- Validate: Đảm bảo có items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'No items to process';
    END IF;

    -- Security check: Đảm bảo user_id truyền vào khớp với user_id đang đăng nhập
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: p_user_id does not match auth.uid()';
    END IF;

    -- Lặp qua từng khoản trong payload
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_installment_id := item->>'id';
        v_month_str := item->>'month_str';
        v_amount := (item->>'amount')::NUMERIC;
        v_description := item->>'description';
        v_category_id := item->>'category_id';
        v_subcategory_id := item->>'subcategory_id';
        v_is_paying := (item->>'is_paying')::BOOLEAN;

        IF v_amount <= 0 THEN
            RAISE EXCEPTION 'Invalid amount % for installment %', v_amount, v_installment_id;
        END IF;

        IF v_is_paying THEN
            v_transaction_type := 'installment_repaid';
        ELSE
            v_transaction_type := 'loan_repaid';
        END IF;

        -- Khóa row trả góp để xử lý đồng thời (Race condition mitigation)
        SELECT * INTO v_installment_record 
        FROM public.installments 
        WHERE id = v_installment_id AND user_id = p_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Installment % not found or does not belong to user', v_installment_id;
        END IF;

        -- Business Idempotency Key
        v_payment_key := p_user_id::text || ':' || v_installment_id || ':' || v_month_str;

        -- Kiểm tra transaction occurrence theo Business Key
        IF EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE user_id = p_user_id AND installment_payment_key = v_payment_key
        ) THEN
            -- Cờ để cho biết ít nhất 1 item đã được xử lý (trường hợp retry)
            v_already_processed := true;
            -- Bỏ qua insert và update paid_months
            CONTINUE;
        END IF;

        -- Nếu chưa có transaction thì insert.
        -- Nhưng trước đó phải kiểm tra paid_months để xem state có inconsistent không
        IF NOT (v_installment_record.paid_months ? v_month_str) THEN
            UPDATE public.installments
            SET paid_months = paid_months || jsonb_build_array(v_month_str)
            WHERE id = v_installment_id AND user_id = p_user_id;
        END IF;
        -- Nếu paid_months ĐÃ chứa tháng này nhưng transaction chưa tồn tại, ta insert transaction
        -- mà KHÔNG cần append vào paid_months nữa (Handle Case C: Inconsistent legacy state)

        -- Insert transaction với installment_payment_key
        BEGIN
            INSERT INTO public.transactions (
                user_id,
                type,
                amount,
                date,
                category_id,
                subcategory_id,
                wallet_id,
                installment_id,
                note,
                payment_batch_id,
                installment_payment_key,
                ai_categorized
            ) VALUES (
                p_user_id,
                v_transaction_type,
                v_amount,
                p_date,
                NULLIF(v_category_id, ''),
                NULLIF(v_subcategory_id, ''),
                NULLIF(p_wallet_id, ''),
                v_installment_id,
                v_description,
                NULLIF(p_payment_batch_id, ''),
                v_payment_key,
                false
            );
        EXCEPTION WHEN unique_violation THEN
            -- Xử lý an toàn: dù check EXISTS không thấy nhưng lúc INSERT lại dính duplicate (Race condition chớp nhoáng)
            v_already_processed := true;
            CONTINUE;
        END;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'already_processed', v_already_processed);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error processing bulk payment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
