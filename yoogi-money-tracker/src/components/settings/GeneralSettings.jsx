import React, { useState } from 'react';
import { Calendar, Save, Loader2, Check } from 'lucide-react';
import { updateUserSettings } from '../../utils/supabaseHelpers';

const GeneralSettings = ({ user, userSettings }) => {
    const [monthStartDay, setMonthStartDay] = useState(userSettings?.monthStartDay || 1);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await updateUserSettings(user.uid, {
                monthStartDay: parseInt(monthStartDay)
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            alert('Lỗi khi lưu cài đặt: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Chu kỳ tài chính
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Tùy chỉnh thời gian bắt đầu tháng để phù hợp với ngày nhận lương của bạn.
                </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Ngày bắt đầu của tháng
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Các bộ lọc "Tháng này", "Tháng trước" và ngân sách sẽ bắt đầu từ ngày này.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={monthStartDay}
                            onChange={(e) => setMonthStartDay(e.target.value)}
                            className="w-24 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                        >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>Ngày {day}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || monthStartDay == (userSettings?.monthStartDay || 1)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Lưu...</>
                            ) : saveSuccess ? (
                                <><Check className="w-4 h-4" /> Đã lưu</>
                            ) : (
                                <><Save className="w-4 h-4" /> Lưu</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                    <strong>Lưu ý:</strong> Việc thay đổi ngày bắt đầu sẽ tự động tính toán lại các biểu đồ và báo cáo theo tháng. Chỉ nên chọn từ ngày 1 đến ngày 28 để tránh lỗi cho các tháng ít ngày.
                </p>
            </div>
        </div>
    );
};

export default GeneralSettings;
