import { useEffect, useRef } from 'react';

// Cờ để biết khi nào lịch sử được back bằng code, tránh vòng lặp
let isProgrammaticBack = false;

/**
 * useBackButton
 * Mẹo dùng window.location.hash để ép Android WebView nhận diện lịch sử,
 * giúp nút Back cứng hoạt động mà không cần cài native plugin.
 */
export function useBackButton(isOpen, onClose) {
    const onCloseRef = useRef(onClose);
    const hashRef = useRef('');

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) {
            // Nếu modal đóng (bằng nút X trên màn hình), ta cần back lại để xóa hash khỏi lịch sử
            if (hashRef.current) {
                if (window.location.hash === hashRef.current) {
                    isProgrammaticBack = true;
                    window.history.back();
                    setTimeout(() => { isProgrammaticBack = false; }, 150);
                }
                hashRef.current = '';
            }
            return;
        }

        // Khi modal mở, tạo một hash ngẫu nhiên và gán vào URL
        const uniqueHash = '#modal-' + Math.random().toString(36).substring(2, 8);
        hashRef.current = uniqueHash;
        
        // Gán hash sẽ ép WebView nhận diện đây là một "trang" mới trong lịch sử
        window.location.hash = uniqueHash;

        const handlePopState = () => {
            if (isProgrammaticBack) return;
            
            // Người dùng vừa bấm nút Back cứng, WebView đã tự lùi lịch sử (xóa hash)
            // Ta gọi hàm đóng modal
            hashRef.current = '';
            if (onCloseRef.current) {
                onCloseRef.current();
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen]);
}
