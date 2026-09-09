import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx: Starting to load app...');

const rootElement = document.getElementById('root');
console.log('main.tsx: Root element found:', !!rootElement);

if (!rootElement) {
  console.error('main.tsx: Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;"><h1 style="color: red;">خطأ: عنصر root غير موجود</h1></div>';
} else {
  try {
    const root = createRoot(rootElement);
    console.log('main.tsx: Root created');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('main.tsx: App rendered');
  } catch (error) {
    console.error('main.tsx: Error rendering app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1 style="color: red;">خطأ في تحميل التطبيق</h1>
        <p>${error}</p>
        <button onclick="location.reload()">إعادة المحاولة</button>
      </div>
    `;
  }
}
