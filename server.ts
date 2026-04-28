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
    try {
      console.log('Initializing Firebase Admin with provided Service Account...');
      const serviceAccount = JSON.parse(serviceAccountVar);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      });
    } catch (err) {
      console.error('ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not valid JSON.');
      throw err;
    }
  } else {
    console.warn('WARNING: No FIREBASE_SERVICE_ACCOUNT found. Falling back to Application Default Credentials...');
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

    // Health Check
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        env: process.env.NODE_ENV,
        firebaseInitialized: !!adminApp
      });
    });

    // API Routes
    
    // Submit a question to a user's profile
    app.post('/api/submit', async (req, res) => {
      try {
        const { username, text } = req.body;

        if (!username || !text) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        if (text.length > 1000) {
          return res.status(400).json({ error: 'Question too long' });
        }

        // Find user by username
        const usernameDoc = await dbInstance.collection('usernames').doc(username.toLowerCase()).get();
        if (!usernameDoc.exists) {
          return res.status(404).json({ error: 'User not found' });
        }

        const { userId } = usernameDoc.data()!;
        
        // Count existing questions (optional but recommended for the "100 questions" limit)
        const questionsCount = await dbInstance.collection('users').doc(userId).collection('questions').count().get();
        if (questionsCount.data().count >= 100) {
          return res.status(400).json({ error: 'Question limit reached for this member.' });
        }
        
        // Add question to user's questions subcollection
        await dbInstance.collection('users').doc(userId).collection('questions').add({
          text,
          createdAt: FieldValue.serverTimestamp(),
          isPublic: false, // Default to hidden until replied
        });

        res.status(200).json({ success: true });
      } catch (error: any) {
        console.error('Error submitting question:', error);
        res.status(500).json({ error: 'Internal server error' });
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

  await startServer();
} catch (error) {
  console.error('CRITICAL: Failed to initialize Firebase Admin:', error);
  // In production, we might want to keep the server running but in a limited mode
  // so the user can at least see a "Maintenance" or "Setup" page rather than a 503.
  // For now, we exit so Render shows a deployment failure.
  process.exit(1);
}
