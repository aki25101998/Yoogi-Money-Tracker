import { useEffect } from 'react';
import { executeRecurringTransactionRPC } from '../utils/supabaseHelpers';

export const useRecurringTransactions = (user, recurringTransactions) => {
    // ==========================================
    // @AI-WARNING: CRITICAL CORE LOGIC
    // DO NOT MODIFY THIS FUNCTION WITHOUT EXPLICIT PERMISSION FROM USER.
    // ĐÂY LÀ VÒNG LẶP XỬ LÝ GIAO DỊCH ĐỊNH KỲ. TUYỆT ĐỐI KHÔNG ĐƯỢC XÓA HOẶC SỬA LOGIC SO SÁNH NGÀY.
    // ==========================================
    useEffect(() => {
        if (!user || recurringTransactions.length === 0) return;

        const intervalId = setInterval(async () => {
            const now = new Date();
            for (const rt of recurringTransactions) {
                const nextDate = new Date(rt.nextDate);
                if (now >= nextDate) {
                    // It's time to execute this recurring transaction
                    try {
                        const transactionData = {
                            type: rt.type,
                            amount: rt.amount,
                            description: rt.description,
                            categoryId: rt.categoryId,
                            subcategoryId: rt.subcategoryId || '',
                            date: now.toISOString(),
                            time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                            walletId: rt.walletId,
                            isRecurring: true,
                            recurringId: rt.id
                        };

                        // Calculate next date
                        const newNextDate = new Date(nextDate);
                        const value = parseInt(rt.intervalValue) || 1;
                        if (rt.intervalUnit === 'Phút') newNextDate.setMinutes(newNextDate.getMinutes() + value);
                        else if (rt.intervalUnit === 'Ngày') newNextDate.setDate(newNextDate.getDate() + value);
                        else if (rt.intervalUnit === 'Tuần') newNextDate.setDate(newNextDate.getDate() + value * 7);
                        else if (rt.intervalUnit === 'Tháng') newNextDate.setMonth(newNextDate.getMonth() + value);
                        else if (rt.intervalUnit === 'Năm') newNextDate.setFullYear(newNextDate.getFullYear() + value);

                        // If the newNextDate is still in the past (e.g. app was offline), catch it up to future
                        while (newNextDate <= now) {
                            if (rt.intervalUnit === 'Phút') newNextDate.setMinutes(newNextDate.getMinutes() + value);
                            else if (rt.intervalUnit === 'Ngày') newNextDate.setDate(newNextDate.getDate() + value);
                            else if (rt.intervalUnit === 'Tuần') newNextDate.setDate(newNextDate.getDate() + value * 7);
                            else if (rt.intervalUnit === 'Tháng') newNextDate.setMonth(newNextDate.getMonth() + value);
                            else if (rt.intervalUnit === 'Năm') newNextDate.setFullYear(newNextDate.getFullYear() + value);
                        }

                        // Generate unique occurrence ID based on the expected nextDate (which represents the current occurrence being processed)
                        const occurrenceId = `${rt.id}_${nextDate.toISOString()}`;

                        const result = await executeRecurringTransactionRPC(
                            user.uid,
                            rt.id,
                            occurrenceId,
                            transactionData,
                            nextDate.toISOString(),
                            newNextDate.toISOString()
                        );

                        if (result && result.success) {
                            console.log("Executed recurring transaction successfully:", rt.description, result.transaction_id);
                        } else {
                            console.log("Skipped recurring transaction execution:", rt.description, result?.reason);
                        }

                    } catch (error) {
                        console.error("Error executing recurring transaction:", error);
                    }
                }
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [user, recurringTransactions]);
};
