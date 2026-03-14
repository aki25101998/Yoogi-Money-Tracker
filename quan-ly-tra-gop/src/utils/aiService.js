// Helper function to call Gemini API directly via fetch
// Uses the EXACT model found in App.jsx (gemini-2.5-flash-preview-09-2025)

const API_KEY = import.meta.env.VITE_GENERATIVE_AI_KEY;

export const parseLoanInfo = async (text) => {
    if (!API_KEY) {
        throw new Error("Missing Gemini API Key");
    }

    // UPDATE: Use the model proven to work in App.jsx
    const MODEL_NAME = "gemini-1.5-flash-8b";
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    const prompt = `
      Bạn là một trợ lý ảo giúp trích xuất thông tin tài chính từ văn bản tiếng Việt.
      Nhiệm vụ: Trích xuất các trường sau và trả về dưới dạng JSON hợp lệ.
      
      Các trường cần lấy:
      - name: Tên khoản vay hoặc món đồ (nếu không rõ, để là "Khoản vay")
      - amount: Số tiền vay (chuyển về số nguyên, ví dụ "10 triệu" -> 10000000)
      - term: Số tháng trả góp (số nguyên)
      - rate: Lãi suất hàng tháng (số thực, nếu người dùng nói lãi suất năm thì tự chia 12, nếu không nói gì thì để 0)
      - startDate: Ngày bắt đầu trả (định dạng YYYY-MM-DD, nếu là "hôm nay" hoặc không nói gì thì lấy ngày hiện tại: ${new Date().toISOString().split('T')[0]})
      - owner: Người trả ("Tôi", "Vợ", "Chồng", hoặc tên riêng. Mặc định là "Tôi")

      Văn bản đầu vào: "${text}"

      Yêu cầu bắt buộc: Chỉ trả về chuỗi JSON thuần túy, không bao gồm dấu backtick hay markdown. Không giải thích gì thêm.
    `;

    try {
        console.log(`AI Service: Sending REST request to ${MODEL_NAME}...`);
        const response = await fetch(URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error("No response from AI");
        }

        console.log("AI Service: Received response:", textResponse);

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
        throw new Error(`[${MODEL_NAME}] ${error.message}`);
    }
};
