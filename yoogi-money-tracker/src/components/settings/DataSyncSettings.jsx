import React, { useState, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Database, Download, Upload } from 'lucide-react';
import { exportUserData, importUserData } from '../../utils/supabaseHelpers';

const DataSyncSettings = ({ user }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: '' }
    const fileInputRef = useRef(null);

    const handleExportJson = async () => {
        if (!user) return;
        try {
            setIsExporting(true);
            setMessage({ type: 'info', text: 'Đang chuẩn bị file JSON...' });
            
            const data = await exportUserData(user.uid);
            const jsonString = JSON.stringify(data, null, 2);
            
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const dateStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
            link.download = `yoogi_backup_${dateStr}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            setMessage({ type: 'success', text: 'Tải file JSON thành công!' });
        } catch (error) {
            console.error('Export error:', error);
            setMessage({ type: 'error', text: 'Lỗi xuất file: ' + error.message });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportJson = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        if (!window.confirm("CẢNH BÁO: Quá trình này sẽ đẩy dữ liệu từ file JSON lên database. Dữ liệu trùng lặp có thể bị ghi đè. Bạn có chắc chắn?")) {
            e.target.value = ''; // Reset input
            return;
        }

        try {
            setIsImporting(true);
            setMessage({ type: 'info', text: 'Đang đọc và đồng bộ file JSON lên Cloud...' });
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            await importUserData(user.uid, data);
            
            setMessage({ type: 'success', text: 'Nhập dữ liệu thành công! Hãy F5 lại trang.' });
        } catch (error) {
            console.error('Import error:', error);
            setMessage({ type: 'error', text: 'Lỗi nhập dữ liệu: ' + error.message });
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Database className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sao Lưu & Khôi Phục Dữ Liệu</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tải toàn bộ dữ liệu về máy để cất giữ, hoặc khôi phục lên đám mây khi cần.
                    </p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex gap-3 ${
                    message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                    'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                    {message.type === 'error' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                    {message.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                    {message.type === 'info' && <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/50 flex flex-col">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Mẹo: Bạn có thể lưu lại file .json này để phòng trường hợp muốn khôi phục dữ liệu hoặc chuyển qua tài khoản khác!
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleExportJson}
                        disabled={isExporting || isImporting}
                        className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        {isExporting ? 'Đang chuẩn bị...' : 'Tải File JSON'}
                    </button>
                    
                    <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleImportJson}
                        className="hidden" 
                    />
                    <button
                        onClick={handleImportClick}
                        disabled={isExporting || isImporting}
                        className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {isImporting ? 'Đang tải lên...' : 'Chọn File JSON'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataSyncSettings;
