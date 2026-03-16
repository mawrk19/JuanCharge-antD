import React from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import routes from './router'; // Import the routes we just made

// This component actually renders the routes
const AppRoutes = () => {
  const element = useRoutes(routes);
  return element;
};

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;