-- ==============================================================================
-- YOOGI MONEY TRACKER - HARDENING PASS (MIGRATION 08)
-- Execute this script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. ADD OCCURRENCE ID TO PREVENT RECURRING TRANSACTION DUPLICATES
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS occurrence_id text;
-- Adding unique constraint to prevent race conditions when multiple clients execute the same recurrence
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_occurrence_id_unique;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_occurrence_id_unique UNIQUE (user_id, occurrence_id);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS debt_id text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS recurring_id text;

CREATE INDEX IF NOT EXISTS idx_transactions_occurrence ON public.transactions(user_id, occurrence_id);
CREATE INDEX IF NOT EXISTS idx_transactions_debt ON public.transactions(user_id, debt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment ON public.transactions(user_id, installment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON public.transactions(user_id, recurring_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts(user_id);

-- 2. ATOMIC RPC FOR RECURRING TRANSACTIONS
-- Handles claiming the occurrence, inserting the transaction, and updating next_date atomically.
CREATE OR REPLACE FUNCTION public.execute_recurring_transaction(
    p_user_id uuid,
    p_recurring_id text,
    p_occurrence_id text,
    p_transaction_data jsonb,
    p_expected_next_date timestamp with time zone,
    p_new_next_date timestamp with time zone
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_next_date timestamp with time zone;
    v_transaction_id text;
    v_result jsonb;
BEGIN
    -- Lock the recurring transaction to prevent race conditions
    SELECT next_date INTO v_current_next_date 
    FROM public.recurring_transactions 
    WHERE id = p_recurring_id AND user_id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recurring transaction not found';
    END IF;

    -- Optimistic concurrency check (if multiple tabs send the same payload simultaneously)
    -- We allow a small tolerance or exact match. Usually exact match is best.
    -- If the next_date has already moved past the expected one, we skip inserting.
    IF v_current_next_date > p_expected_next_date THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Already processed by another client');
    END IF;

    -- Attempt to insert the transaction. The UNIQUE constraint on (user_id, occurrence_id) acts as a secondary shield.
    BEGIN
        INSERT INTO public.transactions (
            user_id, type, amount, note, category_id, subcategory_id, date, time, wallet_id, is_recurring, recurring_id, occurrence_id
        ) VALUES (
            p_user_id,
            p_transaction_data->>'type',
            (p_transaction_data->>'amount')::numeric,
            p_transaction_data->>'note',
            NULLIF(p_transaction_data->>'category_id', ''),
            NULLIF(p_transaction_data->>'subcategory_id', ''),
            p_transaction_data->>'date',
            p_transaction_data->>'time',
            NULLIF(p_transaction_data->>'wallet_id', ''),
            (p_transaction_data->>'is_recurring')::boolean,
            p_recurring_id,
            p_occurrence_id
        ) RETURNING id INTO v_transaction_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Occurrence ID already exists');
    END;

    -- Update the recurring transaction's next date
    UPDATE public.recurring_transactions
    SET next_date = p_new_next_date
    WHERE id = p_recurring_id AND user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id, 'new_next_date', p_new_next_date);
END;
$$;


-- 3. ATOMIC RPC FOR DELETING WALLET
CREATE OR REPLACE FUNCTION public.delete_wallet_safely(
    p_user_id uuid,
    p_wallet_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clear references in AI memory (if table exists and has wallet_id)
    -- Using dynamic SQL in case the table doesn't exist, though we can just execute if we know it does.
    BEGIN
        DELETE FROM public.ai_chat_history WHERE wallet_id = p_wallet_id AND user_id = p_user_id;
    EXCEPTION WHEN undefined_table THEN
        -- Ignore if ai_chat_history doesn't exist or have this column
    END;

    -- Nullify references in transactions
    UPDATE public.transactions SET wallet_id = NULL WHERE wallet_id = p_wallet_id AND user_id = p_user_id;
    UPDATE public.transactions SET to_wallet_id = NULL WHERE to_wallet_id = p_wallet_id AND user_id = p_user_id;
    
    -- Nullify references in debts
    UPDATE public.debts SET wallet_id = NULL WHERE wallet_id = p_wallet_id AND user_id = p_user_id;
    
    -- Nullify references in recurring_transactions
    UPDATE public.recurring_transactions SET wallet_id = NULL WHERE wallet_id = p_wallet_id AND user_id = p_user_id;

    -- Delete the wallet
    DELETE FROM public.wallets WHERE id = p_wallet_id AND user_id = p_user_id;

    RETURN true;
END;
$$;


-- 4. ATOMIC RPC FOR INSTALLMENT PARTIAL PAYMENT
CREATE OR REPLACE FUNCTION public.update_installment_payment_atomic(
    p_user_id uuid,
    p_installment_id text,
    p_month_str text,
    p_diff_amount numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partial_payments jsonb;
    v_paid_months text[];
    v_monthly_payment numeric;
    v_current_paid numeric;
    v_new_paid numeric;
BEGIN
    -- Lock row for update to prevent lost updates
    SELECT partial_payments, paid_months, monthly_payment 
    INTO v_partial_payments, v_paid_months, v_monthly_payment
    FROM public.installments
    WHERE id = p_installment_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment not found';
    END IF;

    -- Ensure JSONB is initialized
    IF v_partial_payments IS NULL THEN
        v_partial_payments := '{}'::jsonb;
    END IF;

    -- Get current paid amount for the month
    v_current_paid := COALESCE((v_partial_payments->>p_month_str)::numeric, 0);
    
    -- Calculate new paid amount
    v_new_paid := v_current_paid + p_diff_amount;
    IF v_new_paid < 0 THEN
        v_new_paid := 0;
    END IF;

    -- Update JSONB
    v_partial_payments := jsonb_set(v_partial_payments, ARRAY[p_month_str], to_jsonb(v_new_paid));

    -- Handle paid_months array
    IF v_new_paid >= v_monthly_payment THEN
        -- Add to paid_months if not exists
        IF NOT p_month_str = ANY(COALESCE(v_paid_months, ARRAY[]::text[])) THEN
            v_paid_months := array_append(COALESCE(v_paid_months, ARRAY[]::text[]), p_month_str);
        END IF;
    ELSE
        -- Remove from paid_months if exists
        IF p_month_str = ANY(COALESCE(v_paid_months, ARRAY[]::text[])) THEN
            v_paid_months := array_remove(v_paid_months, p_month_str);
        END IF;
    END IF;

    -- Update row
    UPDATE public.installments
    SET partial_payments = v_partial_payments,
        paid_months = v_paid_months
    WHERE id = p_installment_id AND user_id = p_user_id;

    RETURN true;
END;
$$;

-- 5. ATOMIC RPC FOR VERSION HISTORY SNAPSHOT
CREATE OR REPLACE FUNCTION public.create_version_snapshot(
    p_user_id uuid,
    p_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data jsonb;
BEGIN
    v_data := jsonb_build_object(
        'settings', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.settings WHERE user_id = p_user_id) t), '[]'::jsonb),
        'abbreviations', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.abbreviations WHERE user_id = p_user_id) t), '[]'::jsonb),
        'ai_memory', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.ai_memory WHERE user_id = p_user_id) t), '[]'::jsonb),
        'lenders', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.lenders WHERE user_id = p_user_id) t), '[]'::jsonb),
        'debtors', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.debtors WHERE user_id = p_user_id) t), '[]'::jsonb),
        'payers', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.payers WHERE user_id = p_user_id) t), '[]'::jsonb),
        'categories', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.categories WHERE user_id = p_user_id) t), '[]'::jsonb),
        'wallets', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.wallets WHERE user_id = p_user_id) t), '[]'::jsonb),
        'installments', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.installments WHERE user_id = p_user_id) t), '[]'::jsonb),
        'debts', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.debts WHERE user_id = p_user_id) t), '[]'::jsonb),
        'recurring_transactions', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.recurring_transactions WHERE user_id = p_user_id) t), '[]'::jsonb),
        'transactions', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM public.transactions WHERE user_id = p_user_id) t), '[]'::jsonb)
    );

    INSERT INTO public.version_history (user_id, name, data)
    VALUES (p_user_id, p_name, v_data);

    RETURN true;
END;
$$;

-- 6. ATOMIC RPC FOR DEBT REPAYMENT
CREATE OR REPLACE FUNCTION public.update_debt_repayment_atomic(
    p_user_id uuid,
    p_debt_id text,
    p_diff_amount numeric
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_debt public.debts%ROWTYPE;
    v_repaid numeric;
    v_new_repaid numeric;
BEGIN
    SELECT * INTO v_debt FROM public.debts WHERE id = p_debt_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN false; END IF;

    v_repaid := v_debt.amount - COALESCE(v_debt.remaining_amount, 0);
    v_new_repaid := GREATEST(0, v_repaid + p_diff_amount);

    UPDATE public.debts 
    SET remaining_amount = v_debt.amount - v_new_repaid,
        status = CASE WHEN v_new_repaid >= v_debt.amount THEN 'paid' ELSE 'active' END
    WHERE id = p_debt_id AND user_id = p_user_id;

    RETURN true;
END;
$$;

-- 7. ATOMIC RPC FOR RESTORE
CREATE OR REPLACE FUNCTION public.restore_user_data_atomic(
    p_user_id uuid,
    p_payload jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validation
    IF p_payload IS NULL THEN
        RAISE EXCEPTION 'Payload is null';
    END IF;

    -- Delete existing data
    DELETE FROM public.transactions WHERE user_id = p_user_id;
    DELETE FROM public.recurring_transactions WHERE user_id = p_user_id;
    DELETE FROM public.debts WHERE user_id = p_user_id;
    DELETE FROM public.installments WHERE user_id = p_user_id;
    DELETE FROM public.wallets WHERE user_id = p_user_id;
    DELETE FROM public.categories WHERE user_id = p_user_id;
    DELETE FROM public.payers WHERE user_id = p_user_id;
    DELETE FROM public.debtors WHERE user_id = p_user_id;
    DELETE FROM public.lenders WHERE user_id = p_user_id;
    DELETE FROM public.ai_memory WHERE user_id = p_user_id;
    DELETE FROM public.abbreviations WHERE user_id = p_user_id;
    DELETE FROM public.settings WHERE user_id = p_user_id;

    -- Insert new data
    IF p_payload ? 'settings' AND jsonb_array_length(p_payload->'settings') > 0 THEN
        INSERT INTO public.settings SELECT * FROM jsonb_populate_recordset(null::public.settings, p_payload->'settings');
    END IF;
    IF p_payload ? 'abbreviations' AND jsonb_array_length(p_payload->'abbreviations') > 0 THEN
        INSERT INTO public.abbreviations SELECT * FROM jsonb_populate_recordset(null::public.abbreviations, p_payload->'abbreviations');
    END IF;
    IF p_payload ? 'ai_memory' AND jsonb_array_length(p_payload->'ai_memory') > 0 THEN
        INSERT INTO public.ai_memory SELECT * FROM jsonb_populate_recordset(null::public.ai_memory, p_payload->'ai_memory');
    END IF;
    IF p_payload ? 'lenders' AND jsonb_array_length(p_payload->'lenders') > 0 THEN
        INSERT INTO public.lenders SELECT * FROM jsonb_populate_recordset(null::public.lenders, p_payload->'lenders');
    END IF;
    IF p_payload ? 'debtors' AND jsonb_array_length(p_payload->'debtors') > 0 THEN
        INSERT INTO public.debtors SELECT * FROM jsonb_populate_recordset(null::public.debtors, p_payload->'debtors');
    END IF;
    IF p_payload ? 'payers' AND jsonb_array_length(p_payload->'payers') > 0 THEN
        INSERT INTO public.payers SELECT * FROM jsonb_populate_recordset(null::public.payers, p_payload->'payers');
    END IF;
    IF p_payload ? 'categories' AND jsonb_array_length(p_payload->'categories') > 0 THEN
        INSERT INTO public.categories SELECT * FROM jsonb_populate_recordset(null::public.categories, p_payload->'categories');
    END IF;
    IF p_payload ? 'wallets' AND jsonb_array_length(p_payload->'wallets') > 0 THEN
        INSERT INTO public.wallets SELECT * FROM jsonb_populate_recordset(null::public.wallets, p_payload->'wallets');
    END IF;
    IF p_payload ? 'installments' AND jsonb_array_length(p_payload->'installments') > 0 THEN
        INSERT INTO public.installments SELECT * FROM jsonb_populate_recordset(null::public.installments, p_payload->'installments');
    END IF;
    IF p_payload ? 'debts' AND jsonb_array_length(p_payload->'debts') > 0 THEN
        INSERT INTO public.debts SELECT * FROM jsonb_populate_recordset(null::public.debts, p_payload->'debts');
    END IF;
    IF p_payload ? 'recurring_transactions' AND jsonb_array_length(p_payload->'recurring_transactions') > 0 THEN
        INSERT INTO public.recurring_transactions SELECT * FROM jsonb_populate_recordset(null::public.recurring_transactions, p_payload->'recurring_transactions');
    END IF;
    IF p_payload ? 'transactions' AND jsonb_array_length(p_payload->'transactions') > 0 THEN
        INSERT INTO public.transactions SELECT * FROM jsonb_populate_recordset(null::public.transactions, p_payload->'transactions');
    END IF;

    RETURN true;
END;
$$;
