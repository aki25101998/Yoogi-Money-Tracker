const functions = require("firebase-functions");
const admin = require("firebase-admin");
const PayOS = require("@payos/node");

admin.initializeApp();
const db = admin.firestore();
const APP_ID = "yoogi-money-tracker"; // Need to match the APP_ID in frontend

// ==============================================
// 1. Cấu hình PayOS (Lấy từ Dashboard PayOS)
// ==============================================
const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || "YOUR_CLIENT_ID";
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || "YOUR_API_KEY";
const PAYOS_CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || "YOUR_CHECKSUM_KEY";

const payos = new PayOS(PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY);

// ==============================================
// 2. Webhook xử lý thanh toán từ PayOS
// ==============================================
exports.payosWebhook = functions.https.onRequest(async (req, res) => {
    try {
        const body = req.body;

        // Bỏ qua nếu không phải dữ liệu hợp lệ
        if (!body || !body.data) {
            return res.status(400).json({ error: "Invalid webhook payload" });
        }

        // 1. Xác thực Webhook bằng Checksum Key để chống giả mạo
        // payos.verifyPaymentWebhookData(body) sẽ throw error nếu chữ ký không hợp lệ
        const webhookData = payos.verifyPaymentWebhookData(body);
        
        // 2. Lấy thông tin nội dung chuyển khoản
        // Nội dung thường có dạng: YGT123456
        const description = webhookData.description.toUpperCase();
        
        // 3. Tìm kiếm đơn hàng / user tương ứng trong Firestore
        // Cách tìm đơn giản: Quét tất cả users, hoặc tốt nhất là lưu Order vào 1 collection `orders`
        // Ở đây chúng ta giả sử bạn có collection `orders`
        // HOẶC tìm user có pendingOrderCode === orderCode trong description.
        // Vì Frontend sinh random `YGT123456` và hiển thị, frontend cần LƯU mã này vào document của user.
        // Do lúc nãy tôi chưa lưu `pendingOrderCode` vào DB ở frontend, để an toàn, chúng ta sẽ làm thế này:
        // Quét collection users xem ai có `pendingOrderCode` trùng khớp.

        const usersRef = db.collection(`artifacts/${APP_ID}/users`);
        const querySnapshot = await usersRef.get();
        
        let targetUserId = null;
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.pendingOrderCode && description.includes(data.pendingOrderCode)) {
                targetUserId = doc.id;
            }
        });

        if (!targetUserId) {
            console.warn("Received payment but no matching user found for description:", description);
            return res.json({ success: true, message: "No matching user, but webhook acknowledged" });
        }

        // 4. Cập nhật isPro = true
        const userSettingsRef = db.doc(`artifacts/${APP_ID}/users/${targetUserId}/settings/preferences`);
        await userSettingsRef.set({ 
            isPro: true, 
            proActivatedAt: new Date().toISOString() 
        }, { merge: true });

        // Xóa pending order code
        await db.doc(`artifacts/${APP_ID}/users/${targetUserId}`).update({
            pendingOrderCode: admin.firestore.FieldValue.delete()
        });

        console.log(`Successfully upgraded user ${targetUserId} to PRO!`);
        
        // Phải trả về JSON thành công cho PayOS
        return res.json({
            success: true,
            message: "Webhook processed successfully"
        });

    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
