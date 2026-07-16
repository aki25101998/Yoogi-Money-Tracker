// Helper function to call Gemini API directly via fetch
// Uses the EXACT model found in App.jsx (gemini-2.5-flash-preview-09-2025)

import { supabase } from '../config/supabase';

export const parseLoanInfo = async (text) => {

    const prompt = `
      Bạn là một trợ lý ảo giúp trích xuất thông tin tài chính từ văn bản tiếng Việt.
      Nhiệm vụ: Trích xuất các trường sau và trả về dưới dạng JSON hợp lệ.
      
      Các trường cần lấy:
      - name: Tên khoản vay hoặc món đồ (nếu không rõ, để là "Khoản vay")
      - amount: Số tiền vay (chuyển về số nguyên, ví dụ "10 triệu" -> 10000000)
      - term: Số tháng trả góp (số nguyên)
      - rate: Lãi suất hàng tháng (số thực, nếu người dùng nói lãi suất năm thì tự chia 12, nếu không nói gì thì để 0)
      - startDate: Ngày bắt đầu trả (định dạng YYYY-MM-DD, nếu là "hôm nay" hoặc không nói gì thì lấy ngày hiện tại: ${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]})
      - owner: Người trả ("Tôi", "Vợ", "Chồng", hoặc tên riêng. Mặc định là "Tôi")

      Văn bản đầu vào: "${text}"

      Yêu cầu bắt buộc: Chỉ trả về chuỗi JSON thuần túy, không bao gồm dấu backtick hay markdown. Không giải thích gì thêm.
    `;

    try {
        const { data, error } = await supabase.functions.invoke('gemini-ai', {
            body: {
                contents: [{ parts: [{ text: prompt }] }]
            }
        });

        if (error) {
            throw new Error(`Edge Function Error: ${error.message}`);
        }

        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error("No response from AI");
        }

        // AI response received successfully

        // Clean up JSON response
        let jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("AI Service Error:", error);
        throw new Error(`[AI Service] ${error.message}`);
    }
};
