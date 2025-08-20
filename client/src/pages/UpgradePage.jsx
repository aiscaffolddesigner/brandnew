// client/src/pages/UpgradePage.jsx
import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { useAuth0 } from '@auth0/auth0-react';
import { useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_APP_STRIPE_PUBLISHABLE_KEY);

function UpgradePage({ onPaymentSuccess, onPaymentError }) {
    const { getAccessTokenSilently } = useAuth0();
    const [clientSecret, setClientSecret] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleFinalizeSubscription = async (paymentMethodId) => {
        try {
            const token = await getAccessTokenSilently();
            const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/api/create-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ paymentMethodId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create subscription on backend.');
            }

            const data = await response.json();
            if (onPaymentSuccess) onPaymentSuccess(data);

        } catch (err) {
            console.error('Error finalizing subscription:', err);
            onPaymentError(err.message);
        }
    };

    const finalizePaymentAfterRedirect = async (setupIntentId) => {
        setLoading(true);
        setError(null);
        try {
            const token = await getAccessTokenSilently();
            const stripe = await stripePromise;
            const { setupIntent, error } = await stripe.retrieveSetupIntent(setupIntentId);

            if (error) {
                throw new Error(error.message);
            }

            if (setupIntent.status === 'succeeded') {
                await handleFinalizeSubscription(setupIntent.payment_method);
            } else {
                throw new Error(`Setup failed with status: ${setupIntent.status}`);
            }

        } catch (err) {
            console.error('Error finalizing redirected payment:', err);
            setError(err.message);
            onPaymentError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const setupIntentId = urlParams.get('setup_intent');
        const redirectStatus = urlParams.get('redirect_status');

        if (setupIntentId && redirectStatus === 'succeeded') {
            finalizePaymentAfterRedirect(setupIntentId);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        const fetchClientSecret = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = await getAccessTokenSilently();
                const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/api/create-payment-intent`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch client secret from the backend.');
                }

                const data = await response.json();
                setClientSecret(data.clientSecret);
            } catch (err) {
                console.error('Error fetching client secret:', err);
                setError(err.message);
                onPaymentError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchClientSecret();
    }, [getAccessTokenSilently, onPaymentError]);

    const appearance = { theme: 'stripe' };
    const options = { clientSecret, appearance };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>Error: {error}</div>;
    }

    return (
        <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
            <h2 style={{ textAlign: 'center' }}>Upgrade to Premium</h2>
            {clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={options}>
                    <CheckoutForm onPaymentSuccess={onPaymentSuccess} onPaymentError={onPaymentError} />
                </Elements>
            )}
            {!clientSecret && !loading && !error && (
                <div style={{ textAlign: 'center', color: '#666' }}>
                    Failed to load payment form. Please try again.
                </div>
            )}
        </div>
    );
}

export default UpgradePage;