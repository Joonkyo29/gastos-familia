import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAapms6BTNQb8mCjiOanBptBHjgrNZy93c",
  authDomain: "gastos-familia-bde54.firebaseapp.com",
  databaseURL: "https://gastos-familia-bde54-default-rtdb.firebaseio.com",
  projectId: "gastos-familia-bde54",
  storageBucket: "gastos-familia-bde54.firebasestorage.app",
  messagingSenderId: "704482734980",
  appId: "1:704482734980:web:5748172aa79e9aca65a3d1"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
