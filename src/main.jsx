import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm',
          style: { background: '#18181B', color: '#FAFAFA', border: '1px solid #3F3F46' },
          success: { iconTheme: { primary: '#52525B', secondary: '#FAFAFA' } },
          error:   { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' } },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
