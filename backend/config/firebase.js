import admin from 'firebase-admin';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[FIREBASE] Admin SDK initialized');
  } catch (err) {
    console.error('[FIREBASE] Admin SDK initialization failed:', err.message);
  }
} else {
  console.warn('[FIREBASE] Admin SDK not initialized — missing credentials');
}

export default admin;
export const isFirebaseAdminConfigured = () => !!admin.apps.length;
