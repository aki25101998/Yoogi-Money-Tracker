import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, RotateCcw, Loader2, CheckCircle2, AlertTriangle, MoreVertical } from 'lucide-react';
import { fetchVersions, saveVersion, restoreVersion } from '../utils/supabaseHelpers';

const VersionHistorySidebar = ({ isOpen, onClose, user }) => {
    const [versions, setVersions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (isOpen && user) {
            loadVersions();
        }
    }, [isOpen, user]);

    const loadVersions = async () => {
        try {
            setIsLoading(true);
            const data = await fetchVersions(user.uid);
            setVersions(data);
        } catch (error) {
            console.error('Error loading versions:', error);
            setMessage({ type: 'error', text: 'Lỗi tải danh sách phiên bản: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateVersion = async () => {
        const name = prompt('Nhập tên phiên bản (để trống sẽ tự động lấy thời gian):');
        if (name === null) return; // User cancelled

        try {
            setIsSaving(true);
            setMessage({ type: 'info', text: 'Đang lưu phiên bản mới...' });
            await saveVersion(user.uid, name || `Bản lưu ${new Date().toLocaleString('vi-VN')}`);
            setMessage({ type: 'success', text: 'Đã lưu phiên bản thành công!' });
            await loadVersions();
        } catch (error) {
            console.error('Error saving version:', error);
            setMessage({ type: 'error', text: 'Lỗi lưu phiên bản: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestore = async (version) => {
        if (!window.confirm(`CẢNH BÁO: Dữ liệu hiện tại sẽ bị XÓA và khôi phục về phiên bản "${version.name || 'không tên'}". Bạn có chắc chắn?`)) {
            return;
        }

        try {
            setIsRestoring(true);
            setMessage({ type: 'info', text: 'Đang khôi phục dữ liệu, vui lòng đợi...' });
            await restoreVersion(user.uid, version.id);
            setMessage({ type: 'success', text: 'Khôi phục thành công! Đang tải lại trang...' });
        } catch (error) {
            console.error('Error restoring version:', error);
            setMessage({ type: 'error', text: 'Lỗi khôi phục: ' + error.message });
            setIsRestoring(false);
        }
    };

    // Helper to format date groups
    const groupVersions = () => {
        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        versions.forEach(v => {
            const vDate = new Date(v.created_at);
            vDate.setHours(0, 0, 0, 0);
            
            let groupName = '';
            if (vDate.getTime() === today.getTime()) {
                groupName = 'Hôm nay';
            } else if (vDate.getTime() === yesterday.getTime()) {
                groupName = 'Hôm qua';
            } else {
                const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
                groupName = `${days[vDate.getDay()]}, ${vDate.getDate()} tháng ${vDate.getMonth() + 1}`;
            }

            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(v);
        });
        
        return groups;
    };

    const groupedVersions = groupVersions();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20" onClick={onClose}></div>
            
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-slide-left">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        Nhật ký phiên bản
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
                    
                    {message && (
                        <div className={`p-3 rounded-lg mb-4 flex gap-2 items-start text-sm ${
                            message.type === 'error' ? 'bg-red-50 text-red-700' :
                            message.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-blue-50 text-blue-700'
                        }`}>
                            {message.type === 'error' && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                            {message.type === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
                            {message.type === 'info' && <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <button 
                        onClick={handleCreateVersion}
                        disabled={isSaving || isRestoring}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-medium transition-colors disabled:opacity-50 mb-6 shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Tạo phiên bản mới
                    </button>

                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">
                            Chưa có phiên bản nào được lưu.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedVersions).map(([groupName, groupVers]) => (
                                <div key={groupName}>
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                                        {groupName}
                                    </h3>
                                    <div className="space-y-2">
                                        {groupVers.map((v) => (
                                            <div 
                                                key={v.id}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                                    selectedVersion?.id === v.id 
                                                    ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' 
                                                    : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700'
                                                }`}
                                                onClick={() => setSelectedVersion(v.id === selectedVersion?.id ? null : v)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                                            {new Date(v.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        {v.name && v.name !== 'Tự động lưu' && (
                                                            <div className="text-sm text-slate-500 mt-0.5">
                                                                {v.name.replace(/^Tự động lưu(:\s*)?/, '')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                
                                                {selectedVersion?.id === v.id && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRestore(v);
                                                            }}
                                                            disabled={isRestoring}
                                                            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                                            Khôi phục bản này
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VersionHistorySidebar;
