import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8'));

// Initialize Firebase Admin
try {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  let adminApp;

  if (serviceAccountVar) {
    console.log('Initializing Firebase Admin with provided Service Account...');
    adminApp = initializeApp({
      credential: cert(JSON.parse(serviceAccountVar)),
      projectId: firebaseConfig.projectId,
    });
  } else {
    console.log('Initializing Firebase Admin with Default Credentials (ADC)...');
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const dbInstance = getFirestore(adminApp, dbId);
  
  console.log(`Firebase Admin initialized successfully for project: ${firebaseConfig.projectId}`);

  async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // API Routes
    
    // Submit a question
    app.post('/api/submit', async (req, res) => {
      try {
        const { formId, text } = req.body;
        const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
        
        // Hash IP
        const salt = process.env.IP_HASH_SALT || 'default_salt';
        const ipHash = crypto.createHash('sha256').update(`${ip}-${salt}`).digest('hex');

        if (!formId || !text) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const formRef = dbInstance.collection('forms').doc(formId);
        const formDoc = await formRef.get();

        if (!formDoc.exists) {
          return res.status(404).json({ error: 'Form not found' });
        }

        const formData = formDoc.data();
        const now = new Date();

        const expiresAt = formData?.expiresAt?.toDate ? formData.expiresAt.toDate() : new Date(formData?.expiresAt?._seconds * 1000 || formData?.expiresAt);

        if (formData?.isExpired || expiresAt < now) {
          return res.status(400).json({ error: 'Form expired' });
        }

        if (formData?.questionCount >= 100) {
          return res.status(400).json({ error: 'Maximum questions reached' });
        }

        // Check if IP already submitted to THIS form
        const existingQuestion = await formRef.collection('questions').where('ipHash', '==', ipHash).limit(1).get();
        if (!existingQuestion.empty) {
          return res.status(400).json({ error: 'You’ve already submitted.' });
        }

        // Create question and increment count atomically
        await dbInstance.runTransaction(async (transaction) => {
          const freshFormDoc = await transaction.get(formRef);
          const freshCount = freshFormDoc.data()?.questionCount || 0;
          
          if (freshCount >= 100) {
            throw new Error('Limit reached during transaction');
          }

          const newQuestionRef = formRef.collection('questions').doc();
          transaction.set(newQuestionRef, {
            text: text.substring(0, 1000), // Basic length limit
            createdAt: FieldValue.serverTimestamp(),
            ipHash: ipHash
          });

          transaction.update(formRef, {
            questionCount: freshCount + 1
          });
        });

        res.status(200).json({ success: true });
      } catch (error: any) {
        console.error('Error submitting question:', error);
        res.status(500).json({ error: error.message || 'Internal server error', details: error.stack });
      }
    });

    // Background Cleanup Task (runs every 10 minutes)
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredForms = await dbInstance.collection('forms')
          .where('expiresAt', '<', now)
          .limit(50)
          .get();

        if (expiredForms.empty) return;

        const batch = dbInstance.batch();
        for (const formDoc of expiredForms.docs) {
          // Marking as expired instead of full delete to avoid subcollection issues in a quick batch
          batch.update(formDoc.ref, { isExpired: true });
        }
        await batch.commit();
        console.log(`Cleaned up ${expiredForms.size} expired forms`);
      } catch (error) {
        console.error('Cleanup task error:', error);
      }
    }, 10 * 60 * 1000);

    // Vite middleware
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  }

  startServer();
} catch (error) {
  console.error('CRITICAL: Failed to initialize Firebase Admin:', error);
  process.exit(1);
}
