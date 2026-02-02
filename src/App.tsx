
import React from 'react';
import { HashRouter as Router } from 'react-router-dom';
import AppRouter from './navigation/AppRouter';

const App: React.FC = () => {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
};

export default App;
