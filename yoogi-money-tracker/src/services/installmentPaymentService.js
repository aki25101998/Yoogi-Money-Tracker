import { supabase } from '../config/supabase';

export const paymentDebugLog = (stage, message, data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = stage.startsWith('[') ? stage : `[${stage}]`;
    const logEntry = {
        timestamp,
        stage: prefix,
        message,
        data
    };
    
    if (prefix.includes('[ERROR]')) {
        console.error(`${prefix} ${timestamp} ${message}`, data || '');
    } else {
        console.info(`${prefix} ${timestamp} ${message}`, data || '');
    }

    if (typeof window !== 'undefined') {
        window.__YOOGI_PAYMENT_DEBUG__ = window.__YOOGI_PAYMENT_DEBUG__ || [];
        window.__YOOGI_PAYMENT_DEBUG__.push(logEntry);
        if (window.__YOOGI_PAYMENT_DEBUG__.length > 100) {
            window.__YOOGI_PAYMENT_DEBUG__.shift();
        }
        
        if (!window.exportYoogiPaymentDebug) {
             window.exportYoogiPaymentDebug = () => JSON.stringify(window.__YOOGI_PAYMENT_DEBUG__, null, 2);
        }
    }
};

/**
 * Xử lý thanh toán trả góp hàng loạt (Atomic RPC)
 * @param {string} userId - ID của user
 * @param {Object} paymentData - Dữ liệu thanh toán
 * @param {string} paymentData.walletId - ID của ví
 * @param {string} paymentData.date - Ngày thanh toán (YYYY-MM-DD)
 * @param {Array} paymentData.items - Danh sách các khoản trả góp cần thanh toán
 * @param {Array} paymentData.categories - Danh sách categories để lookup categoryId
 */
export const processBulkInstallmentPayment = async (userId, paymentData) => {
    const { walletId, date, items: paidItems, categories } = paymentData;

    if (!paidItems || paidItems.length === 0) {
        throw new Error('Không có khoản nào được chọn để thanh toán.');
    }

    // 1. Lấy paymentBatchId từ UI hoặc sinh UUID mới
    const paymentBatchId = paymentData.paymentBatchId || crypto.randomUUID();

    // 2. Map payload thành cấu trúc JSONB cho RPC
    const itemsPayload = paidItems.map(wrapper => {
        const item = wrapper.item;
        const monthStr = wrapper.monthStr;
        const amountNum = wrapper.monthlyRemaining ?? item.monthlyPayment;
        
        // Kiểm tra hợp lệ (validate amount)
        if (amountNum <= 0) {
            throw new Error(`Khoản trả góp "${item.name}" có số tiền thanh toán không hợp lệ.`);
        }

        // Không kiểm tra paidMonths ở frontend nữa, để RPC xử lý idempotency (Already Processed)
        // nhằm tránh lỗi race condition nếu UI chưa kịp refresh.

        const ownerName = item.owner || 'Tôi';
        const isPaying = ownerName === 'Tôi';
        const matchedCategoryId = isPaying 
            ? (categories?.find(c => c.type === 'installment_repaid')?.id || 'tra_no_tra_gop') 
            : (categories?.find(c => c.type === 'loan_repaid')?.id || 'loan_repaid');

        return {
            id: item.id,
            name: item.name,
            month_str: monthStr,
            amount: amountNum,
            description: `Trả góp ${item.name} (T${monthStr.split('-')[1]}/${monthStr.split('-')[0]})`,
            category_id: matchedCategoryId,
            subcategory_id: isPaying ? 'tra_gop' : '',
            is_paying: isPaying
        };
    });

    // Định dạng date
    const now = new Date();
    const [year, month, day] = date.split('-');
    const paymentDate = new Date(year, parseInt(month) - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    const isoDateString = paymentDate.toISOString();

    paymentDebugLog('INSTALLMENT_PAYMENT][SERVICE', 'RPC START', {
        userId,
        walletId,
        date,
        paymentBatchId,
        itemCount: itemsPayload.length,
        itemsPayload
    });

    paymentDebugLog('INSTALLMENT_PAYMENT][RPC', 'CALL START', {
        rpcName: 'process_bulk_installment_payment',
        userId,
        walletId,
        paymentBatchId,
        itemCount: itemsPayload.length,
        payloadSummary: itemsPayload.map(i => ({ id: i.id, name: i.name, month: i.month_str, amount: i.amount })),
        startTime: new Date().toISOString()
    });

    const rpcStartedAt = performance.now();

    // 3. Gọi RPC
    const { data, error } = await supabase.rpc('process_bulk_installment_payment', {
        p_user_id: userId,
        p_wallet_id: walletId || null,
        p_payment_batch_id: paymentBatchId,
        p_date: isoDateString,
        p_items: itemsPayload
    });

    const rpcDuration = performance.now() - rpcStartedAt;

    paymentDebugLog('INSTALLMENT_PAYMENT][RPC', 'RESPONSE', {
        durationMs: rpcDuration,
        hasData: !!data,
        hasError: !!error
    });

    if (error) {
        console.error(
            '[INSTALLMENT_PAYMENT][RPC][ERROR]',
            {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
                error,
                durationMs: rpcDuration
            }
        );
        paymentDebugLog('INSTALLMENT_PAYMENT][RPC][ERROR', 'RPC FAILED', {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            error,
            durationMs: rpcDuration
        });
        throw error;
    }

    paymentDebugLog('INSTALLMENT_PAYMENT][RPC', 'SUCCESS', {
        durationMs: rpcDuration,
        data
    });

    if (data) {
        paymentDebugLog('INSTALLMENT_PAYMENT][RESULT', 'RPC RESULT DATA', {
            success: data?.success,
            alreadyProcessed: data?.already_processed,
            error: data?.error
        });
    }

    if (data && !data.success) {
        throw new Error(data.error || 'Lỗi không xác định từ server.');
    }

    // Không quăng lỗi nếu RPC trả về already_processed = true
    // Đây là Business Idempotency giúp chống double click an toàn

    // 4. Dispatch sự kiện báo hiệu thanh toán thành công để Refresh
    if (typeof window !== 'undefined') {
        paymentDebugLog('INSTALLMENT_PAYMENT][SERVICE', 'REFRESH EVENT DISPATCH', {
            table: 'all',
            action: `Tự động lưu: Thanh toán ${paidItems.length} khoản trả góp`
        });
        window.dispatchEvent(new CustomEvent('supabase_mutate', {
            detail: { 
                table: 'all', 
                action: `Tự động lưu: Thanh toán ${paidItems.length} khoản trả góp` 
            }
        }));
    }

    return data;
};
