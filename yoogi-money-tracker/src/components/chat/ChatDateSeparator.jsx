import React from 'react';

/**
 * ChatDateSeparator component (Messenger style).
 * Displays a clean, centered timestamp/date separator between message groups.
 */
const ChatDateSeparator = ({ label, tooltip }) => {
    if (!label) return null;

    return (
        <div className="flex items-center justify-center py-2 select-none">
            <span 
                className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default"
                title={tooltip}
            >
                {label}
            </span>
        </div>
    );
};

export default ChatDateSeparator;

