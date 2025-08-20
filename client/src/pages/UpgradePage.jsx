// client/src/pages/UpgradePage.jsx
import React, { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_APP_STRIPE_PUBLISHABLE_KEY);

function UpgradePage() {
    const { getAccessTokenSilently } = useAuth0();
    const navigate = useNavigate();
    const [clientSecret, setClientSecret] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');

    const pollForPlanStatus = async () => {
        setStatusMessage('Payment successful! Verifying your plan update...');
        const maxAttempts = 10;
        let attempt = 0;

        while (attempt < maxAttempts) {
            try {
                const token = await getAccessTokenSilently();
                const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/api/user-status`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const userStatus = await response.json();
                    if (userStatus.planStatus === 'premium') {
                        setStatusMessage('Your plan has been successfully upgraded to Premium!');
                        setTimeout(() => navigate('/'), 2000);
                        return;
                    }
                }
            } catch (err) {
                console.error('Error polling for plan status:', err);
            }
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setStatusMessage('Could not verify your plan status. It may take a few minutes to update.');
    };

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
            if (data.subscriptionId) {
                // Subscription was created, now poll for plan update
                await pollForPlanStatus();
            }

        } catch (err) {
            console.error('Error finalizing subscription:', err);
            setError(err.message);
        }
    };

    const finalizePaymentAfterRedirect = async (setupIntentId) => {
        setLoading(true);
        setError(null);
        try {
            const token = await getAccessTokenSilently();
            const stripe = await stripePromise;
            const { setupIntent, error } = await stripe.retrieveSetupIntent(setupIntentId, token);

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
                const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/api/create-setup-intent`, {
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
            } finally {
                setLoading(false);
            }
        };

        fetchClientSecret();
    }, [getAccessTokenSilently, navigate]);

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
            {statusMessage && <div style={{ textAlign: 'center', marginBottom: '20px', color: 'green' }}>{statusMessage}</div>}
            {clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={options}>
                    <CheckoutForm onPaymentSuccess={handleFinalizeSubscription} onPaymentError={setError} />
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