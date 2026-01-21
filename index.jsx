import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import PedidoAppRG from './src/PedidoAppRG.jsx';
import AdminPanel from './src/AdminPanel.jsx';

const isAdmin = window.FORCE_ADMIN || window.location.pathname.includes('/admin');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminPanel /> : <PedidoAppRG />}
  </React.StrictMode>
);
