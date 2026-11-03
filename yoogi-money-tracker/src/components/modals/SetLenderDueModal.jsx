import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Check, RotateCcw } from 'lucide-react';

const QUICK_DAYS = [5, 10, 15, 20, 25, 28, 30];

const SetLenderDueModal = ({
    isOpen,
    onClose,
    lenderName,
    currentDueDay,
    detectedDueDays = [],
    referenceMonth = '',
    onSave
}) => {
    const [selectedDay, setSelectedDay] = useState(currentDueDay || '');
    const [isAuto, setIsAuto] = useState(!currentDueDay);

    useEffect(() => {
        if (isOpen) {
            setSelectedDay(currentDueDay || (detectedDueDays[0] || ''));
            setIsAuto(!currentDueDay);
        }
    }, [isOpen, currentDueDay, detectedDueDays]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (isAuto) {
            onSave(lenderName, null);
        } else {
            const dayNum = parseInt(selectedDay, 10);
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
                alert('Vui lòng chọn ngày hợp lệ từ 1 đến 31.');
                return;
            }
            onSave(lenderName, dayNum);
        }
        onClose();
    };

    const previewDay = isAuto ? (detectedDueDays[0] || 1) : (parseInt(selectedDay, 10) || 1);

    const modalContent = (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                            <Calendar className="w-5 h-5 pointer-events-none" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Cài đặt hạn thanh toán</h3>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{lenderName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-5 h-5 pointer-events-none" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Phương thức xác định ngày đến hạn
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAuto(false)}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${!isAuto
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-none'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <Clock className="w-3.5 h-3.5 pointer-events-none" />
                                <span>Cố định hàng tháng</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAuto(true);
                                    if (detectedDueDays[0]) setSelectedDay(detectedDueDays[0]);
                                }}
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${isAuto
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-none'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <RotateCcw className="w-3.5 h-3.5 pointer-events-none" />
                                <span>Tự động theo hợp đồng</span>
                            </button>
                        </div>
                    </div>

                    {!isAuto ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Ngày đến hạn hàng tháng (1 - 31)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:outline-none font-bold text-base"
                                        placeholder="Nhập ngày (Vd: 15, 20, 25)"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                                        hàng tháng
                                    </span>
                                </div>
                            </div>

                            {/* Quick selection chips */}
                            <div>
                                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Chọn nhanh ngày phổ biến:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_DAYS.map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setSelectedDay(day)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${parseInt(selectedDay, 10) === day
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700'
                                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            Ngày {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                            <p className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-emerald-500" /> Tự động phát hiện theo ngày bắt đầu khoản vay
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {detectedDueDays.length > 0
                                    ? `Các khoản vay hiện tại của ${lenderName} đang đến hạn vào ngày: ${detectedDueDays.join(', ')} hàng tháng.`
                                    : `Chưa phát hiện ngày từ khoản vay nào của ${lenderName}.`}
                            </p>
                        </div>
                    )}

                    {/* Preview box */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                            Xem trước hiển thị trên thẻ
                        </span>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>
                                {isAuto
                                    ? `Hạn tự động: Ngày ${previewDay} hàng tháng`
                                    : `Hạn cố định: Ngày ${previewDay} hàng tháng`}
                            </span>
                            {referenceMonth && (
                                <span className="text-slate-400 text-[11px]">
                                    (Kỳ {referenceMonth}: {String(previewDay).padStart(2, '0')}/{referenceMonth})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-none transition-colors"
                    >
                        Lưu hạn thanh toán
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined' && document.body) {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
};

export default SetLenderDueModal;
