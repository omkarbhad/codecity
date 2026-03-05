import * as admin from 'firebase-admin'
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }) }
export async function verifyToken(token: string) {
  return admin.auth().verifyIdToken(token)
}
