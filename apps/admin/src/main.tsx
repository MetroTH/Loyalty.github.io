import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TenantProvider } from '@loyalink/theme';
import { AdminProvider } from './lib/admin';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TenantProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </TenantProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
