import { supabase } from '../config/supabase';

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

    // 1. Sinh UUID cho batch này để đảm bảo idempotency
    const paymentBatchId = crypto.randomUUID();

    // 2. Map payload thành cấu trúc JSONB cho RPC
    const itemsPayload = paidItems.map(wrapper => {
        const item = wrapper.item;
        const monthStr = wrapper.monthStr;
        const amountNum = wrapper.monthlyRemaining ?? item.monthlyPayment;
        
        // Kiểm tra hợp lệ (validate amount)
        if (amountNum <= 0) {
            throw new Error(`Khoản trả góp "${item.name}" có số tiền thanh toán không hợp lệ.`);
        }

        // Validate state
        const currentPaidMonths = item.paidMonths || [];
        if (currentPaidMonths.includes(monthStr)) {
            throw new Error(`Khoản trả góp "${item.name}" (tháng ${monthStr.split('-')[1]}) đã được thanh toán trước đó.`);
        }

        const ownerName = item.owner || 'Tôi';
        const isPaying = ownerName === 'Tôi';
        const matchedCategoryId = isPaying 
            ? (categories?.find(c => c.type === 'installment_repaid')?.id || 'tra_no_tra_gop') 
            : (categories?.find(c => c.type === 'loan_repaid')?.id || 'loan_repaid');

        return {
            id: item.id,
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

    // 3. Gọi RPC
    const { data, error } = await supabase.rpc('process_bulk_installment_payment', {
        p_user_id: userId,
        p_wallet_id: walletId || null,
        p_payment_batch_id: paymentBatchId,
        p_date: isoDateString,
        p_items: itemsPayload
    });

    if (error) {
        console.error('RPC Error:', error);
        throw error;
    }

    if (data && !data.success) {
        throw new Error(data.error || 'Lỗi không xác định từ server.');
    }

    // 4. Dispatch sự kiện báo hiệu thanh toán thành công để Refresh
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase_mutate', {
            detail: { 
                table: 'all', 
                action: `Tự động lưu: Thanh toán ${paidItems.length} khoản trả góp` 
            }
        }));
    }

    return data;
};
