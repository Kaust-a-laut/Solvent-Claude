import React from 'react';
import ReactDOM from 'react-dom/client';
import { WaterfallArea } from './components/WaterfallArea';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const App = () => {
  return (
    <ErrorBoundary>
      <div className="h-full w-full bg-[#020205] text-white flex flex-col relative overflow-hidden">
         <WaterfallArea />
      </div>
    </ErrorBoundary>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('❌ Critical: Root element not found in DOM');
}
