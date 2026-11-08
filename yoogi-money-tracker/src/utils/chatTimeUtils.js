/**
 * Utility functions for chat timestamps and date separators (Messenger style).
 */

/**
 * Extracts a valid Date object from a chat message.
 * Handles number timestamps, string dates, ISO strings, or transaction dates.
 */
export const getMessageDate = (msg) => {
    if (!msg) return null;
    if (msg.timestamp) {
        const d = new Date(msg.timestamp);
        if (!isNaN(d.getTime())) return d;
    }
    if (msg.transaction?.date) {
        if (msg.transaction.time) {
            const datePart = msg.transaction.date.split('T')[0];
            const d = new Date(`${datePart}T${msg.transaction.time}`);
            if (!isNaN(d.getTime())) return d;
        }
        const d = new Date(msg.transaction.date);
        if (!isNaN(d.getTime())) return d;
    }
    if (msg.createdAt) {
        const d = new Date(msg.createdAt);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
};

/**
 * Checks if two dates fall on the same calendar day.
 */
export const isSameCalendarDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

/**
 * Calculates calendar day difference between targetDate and referenceDate (default: now).
 * 0 = today, 1 = yesterday, 2 = 2 days ago, etc.
 */
export const getCalendarDayDifference = (targetDate, referenceDate = new Date()) => {
    const d1 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const d2 = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determines whether a timestamp separator should be displayed before currMsg.
 * Follows Messenger rules:
 * - Shown at the start of conversation (first real message)
 * - Shown when the calendar date changes between consecutive messages
 * - Shown when the time gap between consecutive messages is >= 20 minutes
 */
export const shouldShowTimestamp = (currMsg, prevMsg) => {
    if (!currMsg) return false;
    // Do not show separator for initial welcome greeting placeholder
    if (currMsg.id === 'welcome') return false;

    // First real message of thread / after welcome message
    if (!prevMsg || prevMsg.id === 'welcome') {
        return true;
    }

    const currDate = getMessageDate(currMsg);
    const prevDate = getMessageDate(prevMsg);

    if (!currDate || !prevDate) return false;

    // 1. Date change between consecutive messages
    if (!isSameCalendarDay(currDate, prevDate)) {
        return true;
    }

    // 2. Timeframe gap: >= 20 minutes apart (Messenger standard)
    const diffMs = Math.abs(currDate.getTime() - prevDate.getTime());
    const TWENTY_MINUTES_MS = 20 * 60 * 1000;
    if (diffMs >= TWENTY_MINUTES_MS) {
        return true;
    }

    return false;
};

/**
 * Formats timestamp in Messenger style (Vietnamese locale):
 * - Today: "17:30"
 * - Within past 7 days: "19:45 T7", "20:08 T7", "08:15 T2", "14:00 CN"
 * - Older in current year: "14:20, 15 thg 10"
 * - Older in previous years: "14:20, 15 thg 10, 2024"
 */
export const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const diffDays = getCalendarDayDifference(date, now);

    // Case 1: Today -> "HH:mm" (e.g. "17:30")
    if (diffDays === 0) {
        return timeStr;
    }

    const DAYS_OF_WEEK_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayOfWeek = DAYS_OF_WEEK_VN[date.getDay()];

    // Case 2: Within past 7 days (1 to 6 days ago) -> "HH:mm T7"
    if (diffDays > 0 && diffDays < 7) {
        return `${timeStr} ${dayOfWeek}`;
    }

    // Case 3: More than 7 days ago, but within current year -> "HH:mm, D thg M"
    const day = date.getDate();
    const month = date.getMonth() + 1;
    if (date.getFullYear() === now.getFullYear()) {
        return `${timeStr}, ${day} thg ${month}`;
    }

    // Case 4: Different year -> "HH:mm, D thg M, YYYY"
    return `${timeStr}, ${day} thg ${month}, ${date.getFullYear()}`;
};

/**
 * Detailed full date-time for hover tooltip.
 * e.g. "19:45:00 - Thứ Bảy, 08/11/2026"
 */
export const formatFullDateTooltip = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const FULL_DAYS_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = FULL_DAYS_VN[date.getDay()];

    return `${hours}:${minutes}:${seconds} - ${dayName}, ${day}/${month}/${year}`;
};

