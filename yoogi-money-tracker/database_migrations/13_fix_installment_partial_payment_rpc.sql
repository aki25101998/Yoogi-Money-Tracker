-- ==============================================================================
-- YOOGI MONEY TRACKER - FIX INSTALLMENT PARTIAL PAYMENT RPC (MIGRATION 13)
-- Execute this script in your Supabase SQL Editor.
-- ==============================================================================

-- Fix bug: 'malformed array literal: "[]"'
-- Nguyên nhân: Cột 'paid_months' trong bảng installments có kiểu dữ liệu là JSONB, 
-- nhưng trong hàm 'update_installment_payment_atomic' lại khai báo biến 'v_paid_months text[]'.
-- Khi gán giá trị JSONB '[]' vào mảng text[], PostgreSQL không phân tích được cú pháp
-- và ném ra ngoại lệ "malformed array literal: "[]"".
-- Khắc phục: Đổi biến 'v_paid_months' sang kiểu JSONB và sử dụng các toán tử JSONB tiêu chuẩn.

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
    v_paid_months jsonb;
    v_monthly_payment numeric;
    v_current_paid numeric;
    v_new_paid numeric;
BEGIN
    -- Kiểm tra xác thực user
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: p_user_id does not match auth.uid()';
    END IF;

    -- Khóa hàng (row-level lock) để chống race condition
    SELECT partial_payments, paid_months, monthly_payment 
    INTO v_partial_payments, v_paid_months, v_monthly_payment
    FROM public.installments
    WHERE id = p_installment_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment not found';
    END IF;

    -- Đảm bảo an toàn null / kiểu dữ liệu JSONB
    IF v_partial_payments IS NULL OR jsonb_typeof(v_partial_payments) <> 'object' THEN
        v_partial_payments := '{}'::jsonb;
    END IF;

    IF v_paid_months IS NULL OR jsonb_typeof(v_paid_months) <> 'array' THEN
        v_paid_months := '[]'::jsonb;
    END IF;

    v_monthly_payment := COALESCE(v_monthly_payment, 0);

    -- Lấy số tiền đã thanh toán của kỳ tháng này
    v_current_paid := COALESCE((v_partial_payments->>p_month_str)::numeric, 0);
    
    -- Tính số tiền thanh toán mới sau khi cộng/trừ chênh lệch
    v_new_paid := v_current_paid + p_diff_amount;
    IF v_new_paid < 0 THEN
        v_new_paid := 0;
    END IF;

    -- Cập nhật vào partial_payments
    v_partial_payments := jsonb_set(v_partial_payments, ARRAY[p_month_str], to_jsonb(v_new_paid));

    -- Xử lý mảng paid_months (JSONB)
    IF v_monthly_payment > 0 AND v_new_paid >= v_monthly_payment THEN
        -- Nếu đã trả đủ hoặc vượt mức hàng tháng thì thêm vào danh sách paid_months (nếu chưa có)
        IF NOT (v_paid_months ? p_month_str) THEN
            v_paid_months := v_paid_months || jsonb_build_array(p_month_str);
        END IF;
    ELSE
        -- Nếu chưa đủ hoặc giảm xuống dưới mức hàng tháng thì gỡ khỏi paid_months (nếu có)
        IF (v_paid_months ? p_month_str) THEN
            v_paid_months := v_paid_months - p_month_str;
        END IF;
    END IF;

    -- Cập nhật lại bản ghi khoản trả góp
    UPDATE public.installments
    SET partial_payments = v_partial_payments,
        paid_months = v_paid_months
    WHERE id = p_installment_id AND user_id = p_user_id;

    RETURN true;
END;
$$;
