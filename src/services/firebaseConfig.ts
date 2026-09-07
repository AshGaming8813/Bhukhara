import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: 'AIzaSyBGUANlji8Cmrr8TxVu6nDATlKYKd2ObUs',
  authDomain: 'cardgameroom-1a4b2.firebaseapp.com',
  databaseURL: 'https://cardgameroom-1a4b2-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'cardgameroom-1a4b2',
  storageBucket: 'cardgameroom-1a4b2.firebasestorage.app',
  messagingSenderId: '909344526957',
  appId: '1:909344526957:web:2f8e59241cf07552d52564',
  measurementId: 'G-PKFJM2F6VM',
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
