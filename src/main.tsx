import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import BenchPanel from './components/BenchPanel';
import PhaseComparisonPanel from './components/PhaseComparisonPanel';
import OptimalPhasePanel from './components/OptimalPhasePanel';
import RecommendationRobustnessPanel from './components/RecommendationRobustnessPanel';
import BlockModelQualityPanel from './components/BlockModelQualityPanel';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <BenchPanel />
    <PhaseComparisonPanel />
    <OptimalPhasePanel />
    <RecommendationRobustnessPanel />
    <BlockModelQualityPanel />
  </React.StrictMode>,
);
