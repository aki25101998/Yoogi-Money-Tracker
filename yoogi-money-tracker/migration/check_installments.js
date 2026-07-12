const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
    const listUsersResult = await admin.auth().listUsers(100);
    const APP_ID = 'my_installment_app';
    for (const user of listUsersResult.users) {
        const userId = user.uid;
        const snap = await db.collection('artifacts').doc(APP_ID).collection('users').doc(userId).collection('installments').get();
        console.log(`User ${userId} installments size:`, snap.size);
        if (!snap.empty) {
            snap.forEach(doc => {
                console.log(doc.id, doc.data());
            });
        }
    }
}
run();
