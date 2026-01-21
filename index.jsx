import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import PedidoAppRG from './src/PedidoAppRG.jsx';
import AdminPanel from './src/AdminPanel.jsx';

const params = new URLSearchParams(window.location.search);
const isAdmin = params.get('panel') === 'admin';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminPanel /> : <PedidoAppRG />}
  </React.StrictMode>
);
