// client/src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Auth0Provider } from '@auth0/auth0-react';

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;

// ****** ADD THESE CONSOLE.LOGS *******
console.log("TEST: index.jsx is running");


// *************************************

// Basic check for essential environment variables
if (!auth0Domain || !auth0ClientId || !auth0Audience) {
  console.error("ERROR: Missing one or more required Auth0 frontend environment variables.");
  console.error("Please ensure VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE are set.");
  // Render an explicit error message instead of just "Loading..." if variables are missing
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>
        <h2>Configuration Error</h2>
        <p>One or more Auth0 environment variables are missing or incorrect. Please check your `client/.env.local` file and restart the frontend server.</p>
        <p>Expected: VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE</p>
      </div>
    </React.StrictMode>
  );
  throw new Error("Auth0 environment variables not set."); // Stop further execution
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: window.location.origin + import.meta.env.BASE_URL, // <--- CHANGE THIS LINE
        audience: auth0Audience,
        scope: "openid profile email"
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
);