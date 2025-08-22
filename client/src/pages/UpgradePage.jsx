// client/src/pages/UpgradePage.jsx
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useStripe } from '@stripe/react-stripe-js';

const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

function UpgradePage() {
    const { getAccessTokenSilently } = useAuth0();
    const stripe = useStripe();

    const handleUpgrade = async () => {
        try {
            const token = await getAccessTokenSilently();

            // 1. Call your backend to create a Checkout Session
            const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create Checkout Session on backend.');
            }

            const session = await response.json();

            // 2. Redirect to Stripe Checkout page
            const { error } = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (error) {
                console.error('Stripe redirect error:', error.message);
                // You can show a user-facing error message here
            }
        } catch (err) {
            console.error('Upgrade process failed:', err);
            // You can show a user-facing error message here
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: 'auto', padding: 20, textAlign: 'center' }}>
            <h2>Upgrade to Premium</h2>
            <p>Unlock all features with our premium plan for only £7.99/month.</p>
            <button
                onClick={handleUpgrade}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#6772e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                Proceed to Checkout
            </button>
        </div>
    );
}

export default UpgradePage;