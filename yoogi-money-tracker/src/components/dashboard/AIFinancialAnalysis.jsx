import React, { useState } from 'react';
import { Sparkles, Loader2, RotateCcw, ChevronUp, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { supabase } from '../../config/supabase';

const UI_COLORS = [
    { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-100 dark:border-blue-800/30", textTitle: "text-blue-500", textValue: "text-blue-700 dark:text-blue-300" },
    { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-100 dark:border-purple-800/30", textTitle: "text-purple-500", textValue: "text-purple-700 dark:text-purple-300" },
    { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-800/30", textTitle: "text-emerald-500", textValue: "text-emerald-700 dark:text-emerald-300" },
    { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-800/30", textTitle: "text-amber-500", textValue: "text-amber-700 dark:text-amber-300" },
    { bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-100 dark:border-rose-800/30", textTitle: "text-rose-500", textValue: "text-rose-700 dark:text-rose-300" }
];

const ResultSection = ({ icon: Icon, title, items, type }) => {
    if (!items || items.length === 0) return null;
    
    const typeStyles = {
        pros: { bg: "bg-emerald-50/50 dark:bg-emerald-900/10", border: "border-emerald-100 dark:border-emerald-800/30", text: "text-emerald-700 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/50", iconColor: "text-emerald-600 dark:text-emerald-400" },
        cons: { bg: "bg-rose-50/50 dark:bg-rose-900/10", border: "border-rose-100 dark:border-rose-800/30", text: "text-rose-700 dark:text-rose-400", iconBg: "bg-rose-100 dark:bg-rose-900/50", iconColor: "text-rose-600 dark:text-rose-400" },
        advices: { bg: "bg-amber-50/50 dark:bg-amber-900/10", border: "border-amber-100 dark:border-amber-800/30", text: "text-amber-700 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-900/50", iconColor: "text-amber-600 dark:text-amber-400" }
    };
    const style = typeStyles[type] || typeStyles.pros;

    return (
        <div className={`rounded-2xl p-4 border ${style.bg} ${style.border}`}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${style.iconBg}`}>
                    <Icon className={`w-4 h-4 ${style.iconColor}`} />
                </div>
                <h4 className={`font-bold text-sm uppercase tracking-wider ${style.text}`}>{title}</h4>
            </div>
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-white/40 dark:border-slate-700/30 shadow-sm">
                        <div className={`mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold ${style.iconBg} ${style.iconColor}`}>
                            {idx + 1}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{item.title}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.detail}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AIFinancialAnalysis = ({ 
    filteredTransactions, 
    categories, 
    dateRange, 
    totalBalance,
    budgetSettings,
    budgetPortfolios 
}) => {
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [showAiAnalysis, setShowAiAnalysis] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

    const activePortfolios = (budgetPortfolios || []).filter(p => parseFloat(p.percentage) > 0 && p.expenseCategoryIds && p.expenseCategoryIds.length > 0);

    const handleAiAnalyzeFinances = async () => {
        if (filteredTransactions.length === 0) return;
        setIsAiAnalyzing(true);
        setShowAiAnalysis(true);
        setAiAnalysisResult(null);
        try {
            const dateLabel = dateRange.label || 'kỳ hiện tại';
            let prompt = "";

            if (activePortfolios.length > 0) {
                // Phân tích theo ngân quỹ người dùng thiết lập
                const validIncomeIds = budgetSettings?.incomeCategoryIds || [];
                const validWalletIds = budgetSettings?.walletIds || [];
                const applyWalletFilter = validWalletIds.length > 0;
                let budgetTotalIncome = 0;
                const categoryExpenses = {};

                filteredTransactions.forEach(t => {
                    if (applyWalletFilter && !validWalletIds.includes(t.walletId)) return;

                    if (t.type === 'income' && validIncomeIds.includes(t.categoryId)) {
                        budgetTotalIncome += Number(t.amount) || 0;
                    } else if (t.type === 'expense') {
                        const amount = Number(t.amount) || 0;
                        const idToTrack = t.subcategoryId || t.categoryId;
                        if (idToTrack) {
                            categoryExpenses[idToTrack] = (categoryExpenses[idToTrack] || 0) + amount;
                        }
                    }
                });

                let budgetAnalysisText = `DỮ LIỆU TÀI CHÍNH THEO NGÂN QUỸ NGƯỜI DÙNG THIẾT LẬP (${dateLabel}):\n`;
                budgetAnalysisText += `- Tổng thu nhập cơ sở (dùng để tính ngân quỹ): ${budgetTotalIncome.toLocaleString('vi-VN')}đ\n`;
                budgetAnalysisText += `- Tổng số dư hiện tại: ${totalBalance.toLocaleString('vi-VN')}đ\n`;
                
                activePortfolios.forEach(p => {
                    const percentage = parseFloat(p.percentage) || 0;
                    const budgetLimit = (budgetTotalIncome * percentage) / 100;
                    const spentAmount = p.expenseCategoryIds.reduce((sum, catId) => sum + (categoryExpenses[catId] || 0), 0);
                    const isExceeded = spentAmount > budgetLimit && budgetLimit > 0;
                    budgetAnalysisText += `  • Nhóm [${p.name}] (${percentage}%): Đã chi ${spentAmount.toLocaleString('vi-VN')}đ / Ngân sách ${budgetLimit.toLocaleString('vi-VN')}đ ${isExceeded ? '⚠️ (VƯỢT NGÂN SÁCH)' : '✅'}\n`;
                });

                prompt = `Bạn là trợ lý AI phân tích ngân sách cá nhân. Người dùng đã thiết lập các nhóm ngân quỹ tùy chỉnh.

${budgetAnalysisText}

Hãy phân tích và gợi ý cách tối ưu hóa dòng tiền dựa theo ngân quỹ đã thiết lập.
BẮT BUỘC trả về ĐÚNG định dạng JSON thuần túy (KHÔNG dùng markdown, KHÔNG backtick) theo cấu trúc sau:
{
  "pros": [
    { "title": "Tóm tắt ưu điểm 1", "detail": "Chi tiết ưu điểm..." }
  ],
  "cons": [
    { "title": "Tóm tắt điểm cần cải thiện 1", "detail": "Chi tiết điểm cần cải thiện, nhấn mạnh các rủi ro..." }
  ],
  "advices": [
    { "title": "Hành động gợi ý 1", "detail": "Chi tiết cách thực hiện, có số liệu cụ thể..." }
  ]
}
Lưu ý: Mỗi mảng (pros, cons, advices) cần có ít nhất 2 mục. Văn phong gần gũi, súc tích, thân thiện.`;

            } else {
                // Fallback: Chiến lược 50/30/20
                const expenseTxns = filteredTransactions.filter(t => t.type === 'expense');
                const incomeTxns = filteredTransactions.filter(t => t.type === 'income');
                const totalExpense = expenseTxns.reduce((s, t) => s + (t.amount || 0), 0);
                const totalIncome = incomeTxns.reduce((s, t) => s + (t.amount || 0), 0);

                const categoryBreakdown = {};
                expenseTxns.forEach(t => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    const catName = cat ? cat.name : 'Chưa phân loại';
                    categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + (t.amount || 0);
                });

                const categoryList = Object.entries(categoryBreakdown)
                    .map(([name, amount]) => ({ name, amount: Math.round(amount), percent: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0 }))
                    .sort((a, b) => b.amount - a.amount);

                prompt = `Bạn là trợ lý AI phân tích ngân sách cá nhân, phân bổ theo quy tắc 50/30/20.

QUY TẮC 50/30/20:
- 50% thu nhập cho NHU CẦU THIẾT YẾU (nhà ở, ăn uống, đi lại, hóa đơn, bảo hiểm)
- 30% thu nhập cho MONG MUỐN (giải trí, mua sắm, du lịch, cafe, ăn ngoài)
- 20% thu nhập cho TIẾT KIỆM & ĐẦU TƯ (tiết kiệm, trả nợ, đầu tư)

DỮ LIỆU TÀI CHÍNH CỦA NGƯỜI DÙNG (${dateLabel}):
- Tổng thu nhập: ${totalIncome.toLocaleString('vi-VN')}đ
- Tổng chi tiêu: ${totalExpense.toLocaleString('vi-VN')}đ
- Tổng số dư hiện tại: ${totalBalance.toLocaleString('vi-VN')}đ
- Chi tiết chi tiêu theo danh mục:
${categoryList.map(c => `  • ${c.name}: ${c.amount.toLocaleString('vi-VN')}đ (${c.percent}%)`).join('\n')}

Hãy phân tích và gợi ý cách tối ưu hóa dòng tiền dựa theo tỷ lệ 50/30/20.
BẮT BUỘC trả về ĐÚNG định dạng JSON thuần túy (KHÔNG dùng markdown, KHÔNG backtick) theo cấu trúc sau:
{
  "pros": [
    { "title": "Tóm tắt ưu điểm 1", "detail": "Chi tiết ưu điểm..." }
  ],
  "cons": [
    { "title": "Tóm tắt điểm cần cải thiện 1", "detail": "Chi tiết điểm cần cải thiện..." }
  ],
  "advices": [
    { "title": "Hành động gợi ý 1", "detail": "Chi tiết cách thực hiện..." }
  ]
}
Lưu ý: Mỗi mảng (pros, cons, advices) cần có ít nhất 2 mục. Văn phong gần gũi, súc tích, thân thiện.`;
            }

            const { data, error } = await supabase.functions.invoke('gemini-ai', {
                body: {
                    contents: [{ parts: [{ text: prompt }] }]
                }
            });
            if (error) throw error;
            
            const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText) {
                try {
                    let jsonString = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const firstBrace = jsonString.indexOf('{');
                    const lastBrace = jsonString.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
                    }
                    const parsedData = JSON.parse(jsonString);
                    setAiAnalysisResult(parsedData);
                } catch (e) {
                    console.error("AI JSON Parse Error:", e, aiText);
                    setAiAnalysisResult("AI trả về sai định dạng. Vui lòng thử lại.");
                }
            } else {
                console.error("AI Error Data:", data);
                setAiAnalysisResult("Lỗi phân tích: " + JSON.stringify(data));
            }
        } catch (error) {
            console.error('AI Analysis error:', error);
            setAiAnalysisResult("Hệ thống đang bận, vui lòng thử lại sau.");
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[28px] border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm overflow-hidden transition-all">
            <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-cyan-50/30 dark:from-emerald-900/20 dark:via-teal-900/15 dark:to-cyan-900/10 border-b border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
                        <Sparkles className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">AI Phân Tích Tài Chính</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {activePortfolios.length > 0 ? 'Dựa trên Ngân quỹ của bạn' : 'Chiến lược 50/30/20'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {showAiAnalysis ? (
                        <>
                            <button 
                                onClick={handleAiAnalyzeFinances} 
                                disabled={isAiAnalyzing || filteredTransactions.length === 0} 
                                className="text-xs bg-white dark:bg-slate-700 border border-emerald-200 dark:border-slate-600 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-600 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all active:scale-95"
                            >
                                <RotateCcw className={`w-3 h-3 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Phân tích lại</span>
                            </button>
                            <button 
                                onClick={() => setShowAiAnalysis(false)} 
                                className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                            >
                                <ChevronUp className="w-3 h-3" />
                                <span className="hidden sm:inline">Thu gọn</span>
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleAiAnalyzeFinances} 
                            disabled={filteredTransactions.length === 0}
                            className="text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-200 dark:shadow-none disabled:opacity-50 transition-all active:scale-95"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Phân tích ngay
                        </button>
                    )}
                </div>
            </div>
            {showAiAnalysis && (
                <div className="p-5 bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-800 dark:to-slate-900">
                    {isAiAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">AI đang phân tích...</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    {activePortfolios.length > 0 ? 'Đang đánh giá chi tiêu theo ngân quỹ của bạn' : 'Đang đánh giá chi tiêu theo quy tắc 50/30/20'}
                                </p>
                            </div>
                        </div>
                    ) : aiAnalysisResult ? (
                        <div className="space-y-4">
                            {/* Quick Stats Bar */}
                            {activePortfolios.length > 0 ? (
                                <div className={`grid grid-cols-${Math.min(activePortfolios.length, 3)} gap-2`}>
                                    {activePortfolios.map((p, index) => {
                                        const c = UI_COLORS[index % UI_COLORS.length];
                                        return (
                                            <div key={p.id} className={`${c.bg} rounded-xl p-3 text-center border ${c.border}`}>
                                                <p className={`text-[10px] font-bold ${c.textTitle} uppercase tracking-wider mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis`}>{p.name}</p>
                                                <p className={`text-sm font-black ${c.textValue}`}>{parseFloat(p.percentage)}%</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800/30">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Nhu cầu</p>
                                        <p className="text-sm font-black text-blue-700 dark:text-blue-300">50%</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-800/30">
                                        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-0.5">Mong muốn</p>
                                        <p className="text-sm font-black text-purple-700 dark:text-purple-300">30%</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800/30">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Tiết kiệm</p>
                                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">20%</p>
                                    </div>
                                </div>
                            )}

                            {/* AI Response Rendered via custom JSON parsing */}
                            {typeof aiAnalysisResult === 'string' ? (
                                <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/30">
                                    {aiAnalysisResult}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <ResultSection icon={CheckCircle} title="Ưu điểm hiện tại" items={aiAnalysisResult.pros} type="pros" />
                                    <ResultSection icon={AlertTriangle} title="Điểm cần cải thiện" items={aiAnalysisResult.cons} type="cons" />
                                    <ResultSection icon={Lightbulb} title="Gợi ý điều chỉnh" items={aiAnalysisResult.advices} type="advices" />
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default AIFinancialAnalysis;
