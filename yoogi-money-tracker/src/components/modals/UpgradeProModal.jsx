import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, ArrowRight, Loader2 } from 'lucide-react';
import { updateUserSettings } from '../../utils/supabaseHelpers';

const PRO_PRICE = 99000;
const BANK_ID = "970403"; // Sacombank
const ACCOUNT_NO = "020087095034"; // Add your actual account no here
const ACCOUNT_NAME = "NGUYEN HUU DUY TONG"; 

const UpgradeProModal = ({ isOpen, onClose, user }) => {
    const [step, setStep] = useState(1); // 1: Info, 2: QR Code, 3: Success (Mock)
    const [orderCode, setOrderCode] = useState('');

    useEffect(() => {
        if (isOpen && step === 1 && user) {
            // Generate a random 6-digit order code when modal opens
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setOrderCode(code);
            
            // Save to Supabase so webhook can find this user
            import('../../config/supabase').then(({ supabase }) => {
                supabase.from('users').update({ pendingOrderCode: `YGT${code}` }).eq('id', user.uid).then(() => {});
            }).catch(console.error);
        }
    }, [isOpen, step, user]);

    if (!isOpen) return null;

    const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${PRO_PRICE}&addInfo=YGT${orderCode}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    const handleMockPaymentSuccess = async () => {
        // This is just a fallback button in case webhook doesn't work,
        // or for testing purposes. In production, this should be hidden
        // and handled by the backend webhook.
        if (!user) return;
        try {
            await updateUserSettings(user.uid, { isPro: true });
            setStep(3);
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header Pattern */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-amber-400 to-orange-500 opacity-20 dark:opacity-10 pointer-events-none"></div>

                <div className="p-6 pb-4 flex justify-between items-center relative z-10 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nâng cấp Pro</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Mở khóa toàn bộ tính năng</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto hide-scrollbar relative z-10 flex-1">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="inline-block px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold rounded-full text-sm mb-3">
                                    Thanh toán một lần - Dùng mãi mãi
                                </div>
                                <div className="text-4xl font-black text-slate-800 dark:text-white">
                                    {PRO_PRICE.toLocaleString('vi-VN')}đ
                                </div>
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                {[
                                    "Không giới hạn số lượng Ví (Free: 2)",
                                    "Mở khóa Trợ lý AI phân loại thông minh",
                                    "Mở khóa tính năng Nhập liệu bằng Giọng nói/AI",
                                    "Mở khóa tính năng Quản lý Trả góp",
                                    "Giao dịch định kỳ không giới hạn",
                                    "Cập nhật tính năng mới miễn phí"
                                ].map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 font-bold" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-1"
                            >
                                Nâng cấp ngay
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col items-center text-center space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                Quét mã QR dưới đây bằng ứng dụng ngân hàng của bạn. Hệ thống sẽ tự động kích hoạt sau vài giây.
                            </p>
                            
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                <img src={qrUrl} alt="VietQR" className="w-64 h-64 object-contain rounded-xl" />
                            </div>

                            <div className="w-full bg-slate-50 dark:bg-slate-750 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-left">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-slate-500">Số tiền:</div>
                                    <div className="font-bold text-slate-800 dark:text-white text-right">{PRO_PRICE.toLocaleString('vi-VN')}đ</div>
                                    <div className="text-slate-500">Nội dung CK:</div>
                                    <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-right">YGT{orderCode}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang chờ thanh toán...
                            </div>
                            
                            {/* Nút bấm tạm thời để Test, sẽ bỏ đi khi có webhook thật */}
                            <button 
                                onClick={handleMockPaymentSuccess}
                                className="text-xs text-slate-400 underline mt-4"
                            >
                                [Dev Test] Giả lập đã thanh toán
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center text-center space-y-4 py-8">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                                <Check className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Nâng cấp thành công!</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                Cảm ơn bạn đã ủng hộ Yoogi Money Tracker. Các tính năng Pro đã được mở khóa.
                            </p>
                            <button 
                                onClick={onClose}
                                className="mt-4 w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold"
                            >
                                Bắt đầu sử dụng
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpgradeProModal;
