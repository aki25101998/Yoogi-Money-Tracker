import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        if (error && error.message && /Failed to fetch dynamically imported module/i.test(error.message)) {
            const lastReload = sessionStorage.getItem('chunkLoadErrorReload');
            if (!lastReload || Date.now() - parseInt(lastReload, 10) > 5000) {
                return { hasError: false }; // Không hiển thị màn hình đỏ, sẽ reload ngay ở componentDidCatch
            }
        }
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        if (error && error.message && /Failed to fetch dynamically imported module/i.test(error.message)) {
            const lastReload = sessionStorage.getItem('chunkLoadErrorReload');
            if (!lastReload || Date.now() - parseInt(lastReload, 10) > 5000) {
                sessionStorage.setItem('chunkLoadErrorReload', Date.now().toString());
                window.location.reload();
                return;
            }
        }

        this.setState({ error, errorInfo });
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#fef2f2', color: '#991b1b', height: '100vh', width: '100vw', overflow: 'auto' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Đã xảy ra lỗi (Crash)</h1>
                    <p style={{ marginBottom: '10px' }}>Vui lòng chụp lại màn hình này và gửi cho AI để sửa lỗi:</p>
                    <pre style={{ backgroundColor: '#fee2e2', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Tải lại trang
                    </button>
                </div>
            );
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;
