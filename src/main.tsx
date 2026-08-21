import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA：正式版才註冊 Service Worker，讓題庫與資源可以離線使用
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // 註冊失敗（例如非 https）就照常線上遊玩
    });
  });
}

// iPad Safari：擋掉雙指縮放與雙擊放大，避免比賽中誤觸
document.addEventListener('gesturestart', (event) => event.preventDefault());
