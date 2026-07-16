import React, { useState } from 'react';
import { Sparkles, Loader2, RotateCcw, ChevronUp } from 'lucide-react';
import { supabase } from '../../config/supabase';

const AIFinancialAnalysis = ({ 
    filteredTransactions, 
    categories, 
    dateRange, 
    totalBalance 
}) => {
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [showAiAnalysis, setShowAiAnalysis] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

    const handleAiAnalyzeFinances = async () => {
        if (filteredTransactions.length === 0) return;
        setIsAiAnalyzing(true);
        setShowAiAnalysis(true);
        setAiAnalysisResult(null);
        try {
            // Build spending breakdown by category
            const expenseTxns = filteredTransactions.filter(t => t.type === 'expense');
            const incomeTxns = filteredTransactions.filter(t => t.type === 'income');
            const totalExpense = expenseTxns.reduce((s, t) => s + (t.amount || 0), 0);
            const totalIncome = incomeTxns.reduce((s, t) => s + (t.amount || 0), 0);

            // Group expenses by category
            const categoryBreakdown = {};
            expenseTxns.forEach(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const catName = cat ? cat.name : 'Chưa phân loại';
                categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + (t.amount || 0);
            });

            const categoryList = Object.entries(categoryBreakdown)
                .map(([name, amount]) => ({ name, amount: Math.round(amount), percent: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0 }))
                .sort((a, b) => b.amount - a.amount);

            const dateLabel = dateRange.label || 'kỳ hiện tại';

            const prompt = `Bạn là Chuyên Gia Phân Tích Tài Chính Cá Nhân Cấp Cao, chuyên về Chiến Lược Quản Lý Tài Chính 50/30/20.

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

Hãy phân tích TOÀN DIỆN theo 3 phần sau:

1. ƯU ĐIỂM HIỆN TẠI ✅
Dựa trên dữ liệu, chỉ ra những điểm tích cực trong cách quản lý tài chính (ít nhất 2-3 điểm).

2. KHUYẾT ĐIỂM HIỆN TẠI ⚠️
Chỉ ra các vấn đề, rủi ro tài chính dựa theo quy tắc 50/30/20 (ít nhất 2-3 điểm).

3. LỜI KHUYÊN TÀI CHÍNH 💡
Đưa ra lời khuyên cụ thể, thực tế để cải thiện tình hình tài chính (ít nhất 2-3 lời khuyên, có con số cụ thể nếu có thể).

QUY TẮC TRÌNH BÀY (BẮT BUỘC):
⛔ CẤM TUYỆT ĐỐI dùng Markdown (không dấu **, không ###, không gạch đầu dòng -).
✅ Mỗi phần bắt đầu bằng tiêu đề có emoji.
✅ Các điểm phân tích dùng emoji số (1️⃣ 2️⃣ 3️⃣) ở đầu.
✅ Văn phong: Chuyên nghiệp, súc tích, thân thiện.
✅ Sử dụng số tiền VNĐ cụ thể khi phân tích.
✅ Giữa các phần cách nhau bằng 1 dòng trống.
✅ Tối đa 400 chữ.`;

            const { data, error } = await supabase.functions.invoke('gemini-ai', {
                body: {
                    action: 'analyze_finances',
                    payload: { contents: [{ parts: [{ text: prompt }] }] }
                }
            });
            if (error) throw error;
            setAiAnalysisResult(data?.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể phân tích lúc này.");
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
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Chiến lược 50/30/20</p>
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
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Đang đánh giá chi tiêu theo quy tắc 50/30/20</p>
                            </div>
                        </div>
                    ) : aiAnalysisResult ? (
                        <div className="space-y-4">
                            {/* Quick Stats Bar */}
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
                            {/* AI Response */}
                            <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                                {aiAnalysisResult}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default AIFinancialAnalysis;
