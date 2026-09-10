import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { paymentDebugLog } from '../../utils/supabaseHelpers';

const PayInstallmentModal = ({ isOpen, onClose, wallets, selectedItems, onConfirm }) => {
    const [form, setForm] = useState({
        walletId: '',
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    });
    const [paymentBatchId, setPaymentBatchId] = useState(null);
    const [debugLogs, setDebugLogs] = useState([]);
    const submitButtonRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handleDebugLog = (e) => {
            if (e.detail?.traceId === paymentBatchId || !paymentBatchId) {
                setDebugLogs(prev => {
                    const newLogs = [...prev, e.detail];
                    if (newLogs.length > 50) newLogs.shift();
                    return newLogs;
                });
            }
        };
        window.addEventListener('yoogi_payment_debug_event', handleDebugLog);
        return () => window.removeEventListener('yoogi_payment_debug_event', handleDebugLog);
    }, [paymentBatchId]);

    useEffect(() => {
        if (isOpen) {
            const newBatchId = crypto.randomUUID();
            setPaymentBatchId(newBatchId);
            setDebugLogs([]); // reset logs for new session
            
            const defaultWalletId = wallets?.length > 0 ? wallets.find(w => w.isDefault)?.id || wallets[0].id : '';
            
            setForm(prev => {
                const walletIdToUse = prev.walletId || defaultWalletId;
                
                paymentDebugLog('MODAL', 'OPEN', {
                    traceId: newBatchId,
                    selectedItemsLength: selectedItems?.length,
                    walletId: walletIdToUse,
                    date: prev.date,
                    paymentBatchId: newBatchId
                });
                
                return {
                    ...prev,
                    walletId: walletIdToUse
                };
            });
        }
    }, [isOpen, wallets, selectedItems]);

    useEffect(() => {
        if (isOpen && paymentBatchId) {
            paymentDebugLog('MODAL', 'RENDER', {
                traceId: paymentBatchId,
                selectedItemsLength: selectedItems?.length,
                walletId: form.walletId,
                paymentBatchId,
                disabled: isSubmitting,
                isSubmitting,
                buttonType: 'submit',
                hasSelectedItems: !!selectedItems?.length
            });

            setTimeout(() => {
                if (submitButtonRef.current) {
                    paymentDebugLog('MODAL', 'RENDER_BUTTON_REF_CHECK', {
                        traceId: paymentBatchId,
                        exists: !!submitButtonRef.current,
                        disabled: submitButtonRef.current.disabled,
                        type: submitButtonRef.current.type,
                        className: submitButtonRef.current.className,
                        dataYoogiPaymentSubmit: submitButtonRef.current.getAttribute('data-yoogi-payment-submit')
                    });
                }
            }, 100);
        }
    }, [isOpen, form.walletId, paymentBatchId, isSubmitting, selectedItems?.length]);

    useEffect(() => {
        if (!isOpen) return;
        
        const rawLogContainer = document.createElement('div');
        rawLogContainer.style.position = 'fixed';
        rawLogContainer.style.top = '0';
        rawLogContainer.style.left = '0';
        rawLogContainer.style.zIndex = '999999';
        rawLogContainer.style.backgroundColor = 'rgba(200,0,0,0.9)';
        rawLogContainer.style.color = 'white';
        rawLogContainer.style.padding = '5px';
        rawLogContainer.style.fontFamily = 'monospace';
        rawLogContainer.style.fontSize = '10px';
        rawLogContainer.style.pointerEvents = 'none';
        rawLogContainer.style.width = '100%';
        rawLogContainer.style.maxHeight = '200px';
        rawLogContainer.style.overflow = 'auto';
        document.body.appendChild(rawLogContainer);

        const addRawLog = (msg) => {
            const line = document.createElement('div');
            line.textContent = msg;
            rawLogContainer.appendChild(line);
            if (rawLogContainer.childNodes.length > 20) {
                rawLogContainer.removeChild(rawLogContainer.firstChild);
            }
            console.log("RAW_LOG:", msg);
        };

        const handleCapture = (event) => {
            const target = event.target;
            const tClass = typeof target.className === 'string' ? target.className : '';
            addRawLog(`CLICK @ (${event.clientX},${event.clientY}): ${target.tagName}.${tClass.split(' ')[0]}`);
            
            if (target.closest('[data-yoogi-payment-submit]')) {
                addRawLog(`-> HIT BUTTON! disabled=${target.closest('[data-yoogi-payment-submit]').disabled}`);
            } else if (target.closest('form')) {
                addRawLog(`-> HIT FORM!`);
            }
            
            if (target && target.closest && target.closest('.max-w-md')) {
                 const btn = target.closest('[data-yoogi-payment-submit]');
                 paymentDebugLog('DOM', 'ANY_MODAL_CLICK', {
                     traceId: paymentBatchId,
                     targetTag: target.tagName,
                     targetClass: tClass,
                     hasSubmitAttr: !!btn,
                     isSubmitting
                 });
            }

            if (target && target.closest && target.closest('[data-yoogi-payment-submit]')) {
                const btn = target.closest('[data-yoogi-payment-submit]');
                paymentDebugLog('DOM', 'WINDOW_CAPTURE_CLICK', {
                    traceId: paymentBatchId,
                    targetTag: target.tagName,
                    targetClass: tClass,
                    buttonDisabled: btn?.disabled,
                    isSubmitting
                });
            }
        };
        
        const handleError = (e) => addRawLog(`ERR: ${e.message}`);
        
        window.addEventListener('click', handleCapture, true);
        window.addEventListener('error', handleError, true);
        addRawLog(`RAW LOGGER INIT (isOpen=${isOpen})`);
        
        return () => {
            window.removeEventListener('click', handleCapture, true);
            window.removeEventListener('error', handleError, true);
            if (document.body.contains(rawLogContainer)) {
                document.body.removeChild(rawLogContainer);
            }
        };
    }, [isOpen, isSubmitting, paymentBatchId]);

    const logButtonEvent = (e, eventType) => {
        const disabled = submitButtonRef.current?.disabled;
        
        paymentDebugLog('BUTTON', eventType, {
            traceId: paymentBatchId,
            eventType,
            disabled: disabled,
            isSubmitting
        });

        if (eventType === 'POINTER_DOWN') {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            paymentDebugLog('DOM', 'ELEMENT_FROM_POINT', {
                traceId: paymentBatchId,
                actualElement: el?.tagName,
                actualClassName: typeof el?.className === 'string' ? el.className : '',
                actualDataAttribute: el?.getAttribute?.('data-yoogi-payment-submit'),
                buttonElement: submitButtonRef.current?.tagName,
                buttonContains: submitButtonRef.current?.contains?.(el)
            });
        }
        
        if (disabled === true) {
            paymentDebugLog('BUTTON', 'DISABLED', {
                traceId: paymentBatchId,
                isSubmitting
            });
        }
    };

    
    if (!isOpen || !selectedItems || selectedItems.length === 0) {
        if (isOpen) {
            paymentDebugLog('MODAL', 'EARLY_RETURN', {
                traceId: paymentBatchId,
                isOpen,
                selectedItemsLength: selectedItems?.length
            });
        }
        return null;
    }

    const totalAmount = selectedItems.reduce((sum, wrapper) => sum + (wrapper.monthlyRemaining ?? wrapper.item.monthlyPayment), 0);
    const lastErrorLog = debugLogs.length > 0 ? [...debugLogs].reverse().find(logItem => logItem.stage.includes('ERROR') || logItem.event.includes('ERROR') || logItem.event.includes('FAILED')) : null;

    
    const safeSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        paymentDebugLog('MODAL', 'SUBMIT_START', {
            traceId: paymentBatchId,
            isSubmittingBeforeSubmit: isSubmitting,
            selectedItemsLength: selectedItems?.length,
            totalAmount,
            walletId: form.walletId,
            date: form.date,
            paymentBatchId
        });
        
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Tạm dừng 5 giây theo yêu cầu của user để copy log
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            await handleSubmit(e);
        } finally {
            paymentDebugLog('MODAL', 'SUBMIT_FINALLY', { traceId: paymentBatchId, isSubmittingAfter: false });
            setIsSubmitting(false);
        }
    };
    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            paymentDebugLog('MODAL', 'ON_CONFIRM_START', { traceId: paymentBatchId });
            await onConfirm({ ...form, totalAmount, items: selectedItems, paymentBatchId });
            paymentDebugLog('MODAL', 'ON_CONFIRM_SUCCESS', { traceId: paymentBatchId });
            onClose();
        } catch (error) {
            paymentDebugLog('MODAL', 'ERROR', {
                traceId: paymentBatchId,
                eventContext: 'ON_CONFIRM_FAILED',
                message: error?.message,
                stack: error?.stack,
                name: error?.name
            });
            console.error("Payment error:", error);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">
                        Thanh toán trả góp
                    </h3>
                    <button onClick={onClose} className="p-1 -mr-2"><X className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" /></button>
                </div>

                <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Bạn đang thanh toán <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedItems.length} khoản</span>.
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Tổng cộng: <span className="font-bold text-2xl text-indigo-600 dark:text-indigo-400 block mt-1">{formatCurrency(totalAmount)}</span>
                    </p>
                </div>

                <form 
                    onSubmit={(e) => {
                        paymentDebugLog('FORM', 'SUBMIT', {
                            traceId: paymentBatchId,
                            defaultPrevented: e.defaultPrevented
                        });
                        return safeSubmit(e);
                    }} 
                    className="p-6 space-y-4"
                >
                    <div className="relative">
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Dùng nguồn tiền từ ví</span>
                        <select
                            required
                            value={form.walletId}
                            onChange={e => setForm({ ...form, walletId: e.target.value })}
                            className="w-full pl-4 pr-10 pt-6 pb-2 appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                        >
                            <option value="" disabled>Chọn ví</option>
                            {wallets?.map(w => (
                                <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <span className="absolute top-2 left-4 text-[10px] text-slate-400 font-medium">Ngày thanh toán</span>
                        <input
                            type="date"
                            required
                            value={form.date}
                            onChange={e => setForm({ ...form, date: e.target.value })}
                            className="w-full px-4 pt-6 pb-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto pr-2 mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-800 py-1">Chi tiết các khoản:</p>
                        {selectedItems.map((wrapper, index) => (
                            <div key={`${wrapper.item.id}-${wrapper.index}-${index}`} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                                <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{wrapper.item.name} (T{wrapper.monthStr.split('-')[1]})</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">{formatCurrency(wrapper.monthlyRemaining ?? wrapper.item.monthlyPayment)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            ref={submitButtonRef}
                            type="submit"
                            data-yoogi-payment-submit="true"
                            disabled={isSubmitting}
                            onPointerDown={(e) => logButtonEvent(e, 'POINTER_DOWN')}
                            onPointerUp={(e) => logButtonEvent(e, 'POINTER_UP')}
                            onMouseDown={(e) => logButtonEvent(e, 'MOUSE_DOWN')}
                            onMouseUp={(e) => logButtonEvent(e, 'MOUSE_UP')}
                            onClick={(e) => {
                                logButtonEvent(e, 'CLICK');
                            }}
                            className={`flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-colors flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <span className="pointer-events-none flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang xử lý...
                                </span>
                            ) : (
                                <span className="pointer-events-none flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> Thanh toán
                                </span>
                            )}
                        </button>
                    </div>
                </form>
                {debugLogs.length > 0 && (
                    <div className="p-3 bg-slate-900 text-xs text-emerald-400 font-mono overflow-y-auto max-h-48 border-t border-slate-700">
                        <div className="font-bold text-white mb-2 pb-1 border-b border-slate-700">DEBUG PAYMENT</div>
                        <div className="mb-2 text-indigo-300">
                            <span className="text-slate-400">Last event: </span>
                            {debugLogs[debugLogs.length - 1]?.message}
                        </div>
                        <div className="mb-2">
                            <span className="text-slate-400 block mb-1">Trace:</span>
                            <div className="flex flex-wrap gap-1">
                                {debugLogs.map((logItem, i) => (
                                    <span key={i} className={logItem.stage.includes('ERROR') || logItem.event.includes('ERROR') ? 'text-red-400' : 'text-emerald-400'}>
                                        {logItem.stage}_{logItem.event}
                                        {i < debugLogs.length - 1 ? ' → ' : ''}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {lastErrorLog && (
                            <div className="mt-2 text-red-400 border-t border-red-900/50 pt-2 break-all">
                                <span className="font-bold block">Last error:</span>
                                {lastErrorLog.data?.message || lastErrorLog.data?.name || JSON.stringify(lastErrorLog.data)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PayInstallmentModal;
