-- 1. Thêm cột payment_batch_id để chống duplicate (Idempotency Key)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_batch_id TEXT;

CREATE INDEX IF NOT EXISTS transactions_payment_batch_id_idx ON public.transactions(payment_batch_id);

-- 2. Tạo function RPC xử lý bulk payment atomic
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
BEGIN
    -- Kiểm tra idempotency (đảm bảo batch này chưa được xử lý)
    IF p_payment_batch_id IS NOT NULL AND p_payment_batch_id != '' THEN
        IF EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE payment_batch_id = p_payment_batch_id AND user_id = p_user_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Payment batch already processed');
        END IF;
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
        
        IF v_is_paying THEN
            v_transaction_type := 'installment_repaid';
        ELSE
            v_transaction_type := 'loan_repaid';
        END IF;

        -- Lock dòng trả góp (tránh race condition)
        SELECT * INTO v_installment_record 
        FROM public.installments 
        WHERE id = v_installment_id AND user_id = p_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Installment % not found', v_installment_id;
        END IF;

        -- Kiểm tra month_str đã thanh toán chưa, nếu chưa thì append
        IF NOT (v_installment_record.paid_months ? v_month_str) THEN
            UPDATE public.installments
            SET paid_months = paid_months || jsonb_build_array(v_month_str)
            WHERE id = v_installment_id AND user_id = p_user_id;
        END IF;

        -- Insert transaction
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
            false
        );
    END LOOP;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error processing bulk payment: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
