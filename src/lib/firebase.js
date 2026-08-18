import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if app is already initialized, otherwise initialize it
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const requestForToken = async () => {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

    // Wait until the service worker is active/ready before retrieving token
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[FIREBASE] Service worker is not ready.');
      return null;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      return token;
    } else {
      console.warn('[FIREBASE] Notification permission denied.');
    }
  } catch (error) {
    console.error('[FIREBASE ERROR] An error occurred while retrieving token:', error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') return;
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    } catch (err) {
      console.error('[FIREBASE MESSAGE LISTENER ERROR]', err);
    }
  });

export const registerOnMessage = (callback) => {
  if (typeof window === 'undefined') return () => {};
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, callback);
  } catch (err) {
    console.error('[FIREBASE REGISTER ON MESSAGE ERROR]', err);
    return () => {};
  }
};
