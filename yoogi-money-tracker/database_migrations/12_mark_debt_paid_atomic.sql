-- 1. Cập nhật lại RPC xử lý Bulk Payment để tránh Null JSONB và Self-Healing dữ liệu
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
    -- Validate
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'No items to process';
    END IF;

    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: p_user_id does not match auth.uid()';
    END IF;

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

        -- Khóa row để tránh race condition
        SELECT * INTO v_installment_record 
        FROM public.installments 
        WHERE id = v_installment_id AND user_id = p_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Installment % not found or does not belong to user', v_installment_id;
        END IF;

        v_payment_key := p_user_id::text || ':' || v_installment_id || ':' || v_month_str;

        -- Kiểm tra Transaction đã tồn tại
        IF EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE user_id = p_user_id AND installment_payment_key = v_payment_key
        ) THEN
            -- Sửa lỗi lệch pha dữ liệu: Nếu Transaction ĐÃ CÓ nhưng paid_months CHƯA ĐƯỢC ĐÁNH DẤU (Null hoặc chưa chứa tháng)
            IF NOT (COALESCE(v_installment_record.paid_months, '[]'::jsonb) ? v_month_str) THEN
                UPDATE public.installments
                SET paid_months = COALESCE(paid_months, '[]'::jsonb) || jsonb_build_array(v_month_str)
                WHERE id = v_installment_id AND user_id = p_user_id;
            END IF;

            v_already_processed := true;
            CONTINUE;
        END IF;

        -- Thêm vào paid_months sử dụng COALESCE an toàn
        IF NOT (COALESCE(v_installment_record.paid_months, '[]'::jsonb) ? v_month_str) THEN
            UPDATE public.installments
            SET paid_months = COALESCE(paid_months, '[]'::jsonb) || jsonb_build_array(v_month_str)
            WHERE id = v_installment_id AND user_id = p_user_id;
        END IF;

        -- Insert Transaction
        BEGIN
            INSERT INTO public.transactions (
                user_id, type, amount, date, category_id, subcategory_id,
                wallet_id, installment_id, note, payment_batch_id,
                installment_payment_key, ai_categorized
            ) VALUES (
                p_user_id, v_transaction_type, v_amount, p_date,
                NULLIF(v_category_id, ''), NULLIF(v_subcategory_id, ''),
                NULLIF(p_wallet_id, ''), v_installment_id, v_description,
                NULLIF(p_payment_batch_id, ''), v_payment_key, false
            );
        EXCEPTION WHEN unique_violation THEN
            -- Xử lý an toàn khi Race condition
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
