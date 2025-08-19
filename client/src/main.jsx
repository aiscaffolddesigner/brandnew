// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Assuming you have a global CSS file

// Import Auth0Provider
import { Auth0Provider } from '@auth0/auth0-react';

// --- NEW Stripe Imports ---
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

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
        redirect_uri: window.location.origin + '/fluffy-octo-memory/', // Ensure this matches your Auth0 callback
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: "openid profile email" // Include any scopes your API needs
      }}
    >
      {/* --- NEW: Wrap with Elements Provider --- */}
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
      {/* --- END Elements Provider --- */}
    </Auth0Provider>
  </React.StrictMode>,
);