-- Migration: 12_mark_debt_paid_atomic
-- Purpose: Adds atomic RPC to pay off remaining debt

CREATE OR REPLACE FUNCTION public.mark_debt_paid_atomic(
    p_user_id UUID,
    p_debt_id TEXT,
    p_wallet_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_debt RECORD;
    v_payment_amount NUMERIC;
    v_transaction_id TEXT := gen_random_uuid()::text;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Security check
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Lock row for idempotency and concurrency
    SELECT * INTO v_debt
    FROM public.debts
    WHERE id = p_debt_id AND user_id = p_user_id
    FOR UPDATE;

    IF v_debt IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Debt not found or unauthorized');
    END IF;

    -- The actual remaining amount is stored in the DB as remaining_amount
    -- But let's verify if remaining_amount is updated correctly. Wait, debtService.js addDebt:
    -- toSave.amount = data.totalAmount;
    -- toSave.remaining_amount = data.totalAmount - (data.repaidAmount || 0);
    -- Yes, remaining_amount is exactly what is left to be paid.
    
    v_payment_amount := COALESCE(v_debt.remaining_amount, 0);

    -- If remaining amount is 0 or less, then it is already paid
    IF v_payment_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_paid', 'message', 'Khoản nợ này đã được thanh toán.');
    END IF;

    -- 1. Create loan_repaid transaction
    INSERT INTO public.transactions (
        id,
        user_id,
        type,
        amount,
        wallet_id,
        debt_id,
        date,
        note,
        created_at,
        updated_at
    ) VALUES (
        v_transaction_id,
        p_user_id,
        'loan_repaid',
        v_payment_amount,
        p_wallet_id,
        p_debt_id,
        v_now,
        'Thanh toán toàn bộ phần còn lại',
        v_now,
        v_now
    );

    -- 2. Update debt status
    UPDATE public.debts
    SET remaining_amount = 0,
        status = 'paid',
        updated_at = v_now
    WHERE id = p_debt_id AND user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true, 
        'transaction_id', v_transaction_id,
        'paid_amount', v_payment_amount
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
