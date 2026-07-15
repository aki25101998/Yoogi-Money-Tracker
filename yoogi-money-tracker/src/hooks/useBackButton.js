import { useEffect, useRef } from 'react';

// Global flag to indicate programmatic back navigation to prevent race conditions
let isProgrammaticBack = false;

// Stack to keep track of open modals, so hardware back only closes the top-most one
const backButtonStack = [];

if (typeof window !== 'undefined') {
    window.addEventListener('hardwareBack', (e) => {
        if (backButtonStack.length > 0) {
            e.preventDefault();
            // Get the top-most modal callback and execute it
            const topMostCallback = backButtonStack[backButtonStack.length - 1];
            topMostCallback();
        }
    });
}

/**
 * useBackButton
 * Xử lý nút back trên điện thoại Android (và vuốt từ mép màn hình) để đóng modal.
 * @param {boolean} isOpen - Modal có đang mở không?
 * @param {function} onClose - Hàm gọi khi cần đóng modal
 */
export function useBackButton(isOpen, onClose) {
    const onCloseRef = useRef(onClose);
    const hasPushedStateRef = useRef(false);

    // Cập nhật ref mỗi khi onClose thay đổi
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) {
            if (hasPushedStateRef.current) {
                if (window.history.state && window.history.state.modalOpen) {
                    isProgrammaticBack = true;
                    window.history.back();
                    setTimeout(() => {
                        isProgrammaticBack = false;
                    }, 150);
                }
                hasPushedStateRef.current = false;
            }
            return;
        }

        // Khi modal mở, delay việc push state một chút để tránh xung đột
        const pushTimeout = setTimeout(() => {
            // Thêm hash vào URL để ép Android WebView nhận diện là có lịch sử trang (tránh lỗi canGoBack = false)
            const uniqueHash = '#modal-' + Math.random().toString(36).substring(2, 8);
            window.history.pushState({ modalOpen: true }, '', window.location.pathname + window.location.search + uniqueHash);
            hasPushedStateRef.current = true;
        }, 50);

        const handlePopState = (e) => {
            if (isProgrammaticBack) {
                return;
            }
            hasPushedStateRef.current = false; // Đã pop rồi
            if (onCloseRef.current) {
                onCloseRef.current();
            }
        };

        const handleHardwareBack = () => {
            hasPushedStateRef.current = false;
            isProgrammaticBack = true;
            window.history.back();
            setTimeout(() => {
                isProgrammaticBack = false;
            }, 150);
            if (onCloseRef.current) {
                onCloseRef.current();
            }
        };

        window.addEventListener('popstate', handlePopState);
        backButtonStack.push(handleHardwareBack);

        return () => {
            clearTimeout(pushTimeout);
            window.removeEventListener('popstate', handlePopState);
            const index = backButtonStack.indexOf(handleHardwareBack);
            if (index !== -1) {
                backButtonStack.splice(index, 1);
            }
        };
    }, [isOpen]);
}
