const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert(require('../serviceAccountKey.json'))
});
const db = admin.firestore();

async function test() {
    const snap = await db.collection('artifacts/my_installment_app/users/636pr2WwWAc8Jy7WIUtoZwq6cxE3/transactions').where('type', '==', 'transfer').limit(5).get();
    snap.forEach(doc => console.log(doc.id, doc.data()));
}
test();
