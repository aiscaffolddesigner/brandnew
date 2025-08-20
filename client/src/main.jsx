// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import Auth0Provider
import { Auth0Provider } from '@auth0/auth0-react';
console.log("TEST: main.jsx is running");
// --- NEW Stripe Imports ---
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// --- NEW Router Import ---
import { BrowserRouter } from 'react-router-dom';

// Load your Stripe publishable key from environment variables
// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_APP_STRIPE_PUBLISHABLE_KEY);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin + '/fluffy-octo-memory/',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: "openid profile email"
      }}
    >
      <BrowserRouter>
        <Elements stripe={stripePromise}>
          <App />
        </Elements>
      </BrowserRouter>
    </Auth0Provider>
  </React.StrictMode>,
);