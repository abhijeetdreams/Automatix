import React from 'react';
import SlackMessages from './components/SlackMessages';
import './App.css';

const App = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Slack Integration</h1>
      </header>
      <main>
        <SlackMessages />
      </main>
    </div>
  );
};

export default App;
