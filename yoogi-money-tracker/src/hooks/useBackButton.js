import { useEffect, useRef } from 'react';

// Global flag to indicate programmatic back navigation to prevent race conditions
let isProgrammaticBack = false;

/**
 * useBackButton
 * Xử lý nút back trên điện thoại Android (và vuốt từ mép màn hình) để đóng modal.
 * @param {boolean} isOpen - Modal có đang mở không?
 * @param {function} onClose - Hàm gọi khi cần đóng modal
 */
export function useBackButton(isOpen, onClose) {
    const onCloseRef = useRef(onClose);
    const hasPushedStateRef = useRef(false);

    // Cập nhật ref mỗi khi onClose thay đổi để không cần đưa onClose vào dependency của useEffect
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) {
            // Nếu modal đóng (có thể do người dùng ấn nút X trên UI)
            // Và trước đó ta đã push state, thì ta cần back lại 1 bước để xóa state đó khỏi lịch sử
            if (hasPushedStateRef.current) {
                // Kiểm tra xem state hiện tại có phải là state của modal này không
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

        // Khi modal mở, delay việc push state một chút để tránh xung đột với modal trước đó vừa đóng
        const pushTimeout = setTimeout(() => {
            window.history.pushState({ modalOpen: true }, '', '');
            hasPushedStateRef.current = true;
        }, 50);

        const handlePopState = (e) => {
            if (isProgrammaticBack) {
                // Bỏ qua sự kiện này vì nó được kích hoạt bởi code (modal khác vừa đóng)
                return;
            }
            // Khi người dùng ấn nút Back cứng, trình duyệt tự động pop state
            // Ta chỉ cần gọi hàm onClose
            hasPushedStateRef.current = false; // Đã pop rồi
            if (onCloseRef.current) {
                onCloseRef.current();
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            clearTimeout(pushTimeout);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen]);
}
