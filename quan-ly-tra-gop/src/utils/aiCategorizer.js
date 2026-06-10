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
 * Find the "Chưa phân loại" subcategory in a category
 */
const findUncategorizedSub = (category) => {
    if (!category || !category.subcategories) return null;
    return category.subcategories.find(sub =>
        sub.name === 'Chưa phân loại' || sub.id === 'chua_phan_loai'
    );
};

/**
 * Find the first category of a given type that has "Chưa phân loại"
 */
const findDefaultUncategorized = (categories, type) => {
    const filtered = categories.filter(c => c.type === type);
    for (const cat of filtered) {
        const sub = findUncategorizedSub(cat);
        if (sub) return { categoryId: cat.id, subcategoryId: sub.id };
    }
    // Fallback: first category of that type
    if (filtered.length > 0) {
        return {
            categoryId: filtered[0].id,
            subcategoryId: filtered[0].subcategories?.[0]?.id || 'chua_phan_loai',
        };
    }
    return { categoryId: '', subcategoryId: '' };
};

/**
 * Call Gemini API to categorize a transaction
 */
const callGeminiForCategory = async (description, type, categories) => {
    if (!API_KEY) {
        console.warn('No Gemini API key, falling back to uncategorized');
        return null;
    }

    // Build category context for the prompt
    const relevantCats = categories.filter(c => c.type === type);
    const categoryContext = relevantCats.map(cat => ({
        id: cat.id,
        name: cat.name,
        subcategories: cat.subcategories
            .filter(s => s.name !== 'Chưa phân loại')
            .map(s => ({ id: s.id, name: s.name, description: s.description })),
    }));

    const prompt = `Bạn là trợ lý phân loại chi tiêu/thu nhập cá nhân.

Giao dịch: "${description}"
Loại: ${type === 'income' ? 'Thu nhập' : 'Chi tiêu'}

Danh mục hiện có:
${JSON.stringify(categoryContext, null, 2)}

Hãy phân loại giao dịch trên vào danh mục phù hợp nhất.
Trả về JSON thuần túy (KHÔNG markdown, KHÔNG backtick):
{"categoryId": "...", "subcategoryId": "...", "confidence": 0.0-1.0}

Nếu không chắc chắn (confidence < 0.5), trả về categoryId và subcategoryId rỗng.`;

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

        // Validate the result
        if (result.confidence && result.confidence < 0.5) return null;
        if (!result.categoryId || !result.subcategoryId) return null;

        // Verify the IDs actually exist
        const cat = relevantCats.find(c => c.id === result.categoryId);
        if (!cat) return null;
        const sub = cat.subcategories.find(s => s.id === result.subcategoryId);
        if (!sub) return null;

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
export const categorizeTransaction = async (rawInput, categories, aiMemories) => {
    // Step 1: Parse input
    const parsed = parseInput(rawInput);
    if (!parsed) {
        throw new Error('Không thể trích xuất số tiền từ nội dung. Hãy thử lại với format: "ăn sáng 50k"');
    }

    const { description, amount } = parsed;

    // Step 2: Guess type (income/expense)
    const type = guessTransactionType(description);

    // Step 3: Check AI Memory first
    const memoryMatch = searchMemory(aiMemories, description);

    if (memoryMatch) {
        // Verify the matched category still exists
        const cat = categories.find(c => c.id === memoryMatch.categoryId);
        if (cat) {
            return {
                type,
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

    // Step 4: Call Gemini API
    const geminiResult = await callGeminiForCategory(description, type, categories);

    if (geminiResult) {
        return {
            type,
            amount,
            description,
            categoryId: geminiResult.categoryId,
            subcategoryId: geminiResult.subcategoryId,
            aiCategorized: true,
            aiSource: 'gemini',
            date: new Date().toISOString().split('T')[0],
        };
    }

    // Step 5: Fallback to "Chưa phân loại"
    const uncategorized = findDefaultUncategorized(categories, type);

    return {
        type,
        amount,
        description,
        categoryId: uncategorized.categoryId,
        subcategoryId: uncategorized.subcategoryId,
        aiCategorized: false,
        aiSource: 'fallback',
        date: new Date().toISOString().split('T')[0],
    };
};
