/**
 * AI Categorizer Service
 * 
 * Flow:
 * 1. Parse user input (e.g. "ăn sáng 50k") → extract description + amount
 * 2. Check AI Memory for matching keyword
 * 3. If no match → call Gemini API with category context
 * 4. If Gemini uncertain → fall back to "Chưa phân loại"
 * 5. Return categorized transaction data
 */

const API_KEY = import.meta.env.VITE_GENERATIVE_AI_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Parse a natural language input into amount + description
 * Examples:
 *   "ăn sáng 50k"       → { description: "ăn sáng", amount: 50000 }
 *   "100k grab"          → { description: "grab", amount: 100000 }
 *   "lương 15 triệu"    → { description: "lương", amount: 15000000 }
 *   "mua quần áo 350000" → { description: "mua quần áo", amount: 350000 }
 */
export const parseInput = (text) => {
    const cleaned = text.trim();
    if (!cleaned) return null;

    // Regex patterns for Vietnamese currency
    // Match: 50k, 50K, 50 nghìn, 500000, 15 triệu, 1.5tr, 1,5 triệu
    const patterns = [
        // "15 triệu" or "15tr" or "1.5 triệu" or "1,5tr"
        /(\d+[.,]?\d*)\s*(triệu|tr)\b/i,
        // "50k" or "50K" or "50 nghìn" or "50 ngàn"
        /(\d+[.,]?\d*)\s*(k|K|nghìn|ngàn|ng)\b/i,
        // Plain number (at least 4 digits to avoid matching random numbers)
        /(\d{4,})/,
    ];

    let amount = 0;
    let description = cleaned;

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            const numStr = match[1].replace(',', '.');
            const num = parseFloat(numStr);
            const unit = (match[2] || '').toLowerCase();

            if (unit === 'triệu' || unit === 'tr') {
                amount = num * 1000000;
            } else if (['k', 'nghìn', 'ngàn', 'ng'].includes(unit)) {
                amount = num * 1000;
            } else {
                amount = num;
            }

            // Remove the matched amount from description
            description = cleaned.replace(match[0], '').trim();
            // Clean up extra spaces
            description = description.replace(/\s+/g, ' ').trim();
            break;
        }
    }

    // If no amount found, return null
    if (amount === 0) return null;

    // If no description, use the original text
    if (!description) description = cleaned;

    return { description, amount: Math.round(amount) };
};

/**
 * Determine if a transaction is income or expense based on keywords
 */
export const guessTransactionType = (description) => {
    const incomeKeywords = [
        'lương', 'thưởng', 'thu nhập', 'nhận', 'hoàn tiền', 'cashback',
        'lãi', 'cổ tức', 'bán', 'cho thuê', 'được tặng', 'thu hồi',
        'freelance', 'dự án', 'bonus', 'thu'
    ];

    const lower = description.toLowerCase();
    for (const kw of incomeKeywords) {
        if (lower.includes(kw)) return 'income';
    }
    return 'expense';
};

/**
 * Search AI Memory for a matching keyword
 * Returns the matched memory rule or null
 */
export const searchMemory = (memories, description) => {
    const normalizedDesc = description.toLowerCase().trim();

    // Exact match first
    const exactMatch = memories.find(m =>
        m.keyword.toLowerCase().trim() === normalizedDesc
    );
    if (exactMatch) return exactMatch;

    // Partial match: check if description CONTAINS a keyword or vice versa
    const partialMatch = memories.find(m => {
        const kw = m.keyword.toLowerCase().trim();
        return normalizedDesc.includes(kw) || kw.includes(normalizedDesc);
    });

    return partialMatch || null;
};

/**
 * Find the main "Chưa phân loại" category
 */
const findDefaultUncategorized = (categories, type) => {
    const filtered = categories.filter(c => c.type === type);
    
    // Find the dedicated uncategorized category
    const uncategorizedCat = filtered.find(c => 
        c.id === (type === 'expense' ? 'uncategorized_expense' : 'uncategorized_income') || 
        c.name === 'Chưa phân loại' || 
        c.name === '❓ Chưa phân loại'
    );
    
    if (uncategorizedCat) {
        return { categoryId: uncategorizedCat.id, subcategoryId: '' };
    }
    
    // Fallback: first category of that type
    if (filtered.length > 0) {
        return {
            categoryId: filtered[0].id,
            subcategoryId: '',
        };
    }
    return { categoryId: '', subcategoryId: '' };
};

/**
 * Call Gemini API to extract FULL transaction context
 */
const callGeminiWithFullContext = async (rawInput, amount, categories, wallets, payers, debtors) => {
    if (!API_KEY) {
        console.warn('No Gemini API key, falling back to uncategorized');
        return null;
    }

    // Build contexts
    const categoryContext = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        subcategories: (cat.subcategories || []).map(s => ({ id: s.id, name: s.name })),
    }));
    const walletContext = (wallets || []).map(w => ({ id: w.id, name: w.name }));
    const payerContext = (payers || []).map(p => ({ id: p.id, name: p.name }));
    const debtorContext = (debtors || []).map(p => ({ id: p.id, name: p.name }));

    const prompt = `Bạn là siêu AI phân tích tài chính cá nhân.

Giao dịch gốc: "${rawInput}"
Số tiền đã trích xuất: ${amount}

Hãy phân tích giao dịch trên và phân loại vào MỘT trong các nhóm sau:

1. Chi tiêu (expense) hoặc Thu nhập (income):
   - Chọn categoryId và subcategoryId phù hợp nhất từ danh sách.
   - Chọn walletId (id của ví) nếu người dùng có nhắc đến tên ví (ví dụ "từ atm", "trong momo").

2. Chuyển tiền nội bộ (transfer):
   - Ví dụ: "chuyển 50k từ bidv sang momo".
   - walletId: ví nguồn (bị trừ tiền).
   - transferTo: ví đích (được cộng tiền).

3. Vay mượn (loan_given: cho người khác mượn / loan_repaid: người khác trả nợ):
   - Ví dụ: "cho mẹ mượn 50k từ atm", "tuấn trả nợ 200k vào bidv".
   - personName: tên người mượn/trả. Nếu tên này có trong danh sách Người dùng dưới đây, hãy dùng chính xác tên đó. Nếu chưa có, hãy trả về tên gốc.
   - walletId: ví bị trừ tiền (nếu cho mượn) hoặc ví được cộng tiền (nếu nhận trả nợ).

Danh sách Ví (Wallets):
${JSON.stringify(walletContext, null, 2)}

Danh sách Danh mục (Categories):
${JSON.stringify(categoryContext, null, 2)}

Danh sách Người dùng/Trả góp (Payers):
${JSON.stringify(payerContext, null, 2)}

Danh sách Người mượn nợ (Debtors):
${JSON.stringify(debtorContext, null, 2)}

Trả về ĐÚNG định dạng JSON thuần túy (KHÔNG markdown, KHÔNG backtick):
{
  "type": "expense" | "income" | "transfer" | "loan_given" | "loan_repaid",
  "categoryId": "...",
  "subcategoryId": "...",
  "walletId": "...",
  "transferTo": "...",
  "personName": "...",
  "confidence": 0.0-1.0
}
Lưu ý: Nếu thuộc tính nào không áp dụng (ví dụ personName cho expense), hãy để chuỗi rỗng "".`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) return null;

        // Parse JSON from response
        let jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        const result = JSON.parse(jsonString);

        // We won't strictly validate IDs here because type could be loan_given/transfer
        return result;
    } catch (error) {
        console.error('Gemini categorization error:', error);
        return null;
    }
};

/**
 * Main categorization function
 * 
 * @param {string} rawInput - User's natural language input (e.g. "ăn sáng 50k")
 * @param {Array} categories - All user's categories from Firestore
 * @param {Array} aiMemories - All AI memory rules from Firestore
 * @returns {Object} Transaction data ready to save
 */
export const categorizeTransaction = async (rawInput, categories, aiMemories, wallets, payers, debtors) => {
    // Step 1: Parse input
    const parsed = parseInput(rawInput);
    if (!parsed) {
        throw new Error('Không thể trích xuất số tiền từ nội dung. Hãy thử lại với format: "ăn sáng 50k"');
    }

    const { description, amount } = parsed;

    // Step 2: Guess type (income/expense) as fallback
    const guessedType = guessTransactionType(description);

    // Step 3: Check AI Memory first (only applies to simple income/expense)
    const memoryMatch = searchMemory(aiMemories, description);

    if (memoryMatch) {
        const cat = categories.find(c => c.id === memoryMatch.categoryId);
        if (cat) {
            return {
                type: guessedType,
                amount,
                description,
                categoryId: memoryMatch.categoryId,
                subcategoryId: memoryMatch.subcategoryId,
                aiCategorized: true,
                aiSource: 'memory',
                memoryId: memoryMatch.id,
                date: new Date().toISOString().split('T')[0],
            };
        }
    }

    // Step 4: Call Gemini API with FULL context
    const geminiResult = await callGeminiWithFullContext(rawInput, amount, categories, wallets, payers, debtors);

    if (geminiResult && geminiResult.confidence >= 0.5) {
        let finalPersonName = geminiResult.personName || null;
        if (finalPersonName && debtors && debtors.length > 0) {
            const matchedDebtor = debtors.find(p => p.name.trim().toLowerCase() === finalPersonName.trim().toLowerCase());
            if (matchedDebtor) {
                finalPersonName = matchedDebtor.name;
            }
        }

        return {
            type: geminiResult.type,
            amount,
            description,
            categoryId: geminiResult.categoryId || '',
            subcategoryId: geminiResult.subcategoryId || '',
            walletId: geminiResult.walletId || null,
            transferTo: geminiResult.transferTo || null,
            personName: finalPersonName,
            aiCategorized: true,
            aiSource: 'gemini',
            date: new Date().toISOString().split('T')[0],
        };
    }

    // Step 5: Fallback to "Chưa phân loại"
    const uncategorized = findDefaultUncategorized(categories, guessedType);

    return {
        type: guessedType,
        amount,
        description,
        categoryId: uncategorized.categoryId,
        subcategoryId: uncategorized.subcategoryId,
        aiCategorized: false,
        aiSource: 'fallback',
        date: new Date().toISOString().split('T')[0],
    };
};
