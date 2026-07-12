const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    const rootCols = await db.listCollections();
    for (const c of rootCols) {
        console.log('Root:', c.id);
        if (c.id === 'artifacts') {
            const docs = await c.listDocuments();
            for (const d of docs) {
                console.log('  Doc:', d.id);
                const subCols = await d.listCollections();
                for (const sub of subCols) {
                    console.log('    SubCol:', sub.id);
                    if (sub.id === 'users') {
                        const userDocs = await sub.listDocuments();
                        console.log('      Found', userDocs.length, 'users');
                    }
                }
            }
        }
    }
}
run().then(() => process.exit(0));
