import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AINotesPage from '../../pages/AINotesPage';

const AIContextModal = ({ isOpen, onClose, user, aiMemories, categories }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        Ví ngữ cảnh của Rolly
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <AINotesPage 
                        user={user} 
                        aiMemories={aiMemories} 
                        categories={categories} 
                        hideHeader={true} 
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AIContextModal;
