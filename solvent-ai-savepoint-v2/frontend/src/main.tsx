import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatArea } from './components/ChatArea';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="h-screen w-screen bg-slate-950">
      <ChatArea />
    </div>
  </React.StrictMode>,
);
