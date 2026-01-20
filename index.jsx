import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import PedidoAppRG from './src/PedidoAppRG.jsx';
import AdminPanel from './src/AdminPanel.jsx';

// Detectar si estamos en /admin
const isAdmin = window.location.pathname === '/admin' || window.location.pathname === '/admin/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminPanel /> : <PedidoAppRG />}
  </React.StrictMode>
);