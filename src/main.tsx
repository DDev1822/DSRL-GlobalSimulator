import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import BenchPanel from './components/BenchPanel';
import PhaseComparisonPanel from './components/PhaseComparisonPanel';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <BenchPanel />
    <PhaseComparisonPanel />
  </React.StrictMode>,
);
