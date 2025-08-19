// client/src/components/CheckoutForm.jsx
import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useAuth0 } from '@auth0/auth0-react';

function CheckoutForm({ onPaymentSuccess, onPaymentError }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);

    const { user, getAccessTokenSilently, isAuthenticated } = useAuth0();
    const [billingName, setBillingName] = useState(user?.name || '');

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
            setPaymentStatus('failed');
            if (onPaymentError) onPaymentError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setPaymentStatus('processing');

        if (!stripe || !elements) {
            setLoading(false);
            return;
        }

        try {
            const { setupIntent, error } = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    // CORRECT: Update the return_url to include the subdirectory
                    return_url: `${window.location.origin}/fluffy-octo-memory/`,
                    payment_method_data: {
                        billing_details: {
                            name: billingName,
                        },
                    },
                },
            });

            if (error) {
                setPaymentStatus('failed');
                if (onPaymentError) onPaymentError(error.message);
                setLoading(false);
                return;
            }

            if (setupIntent.status === 'succeeded') {
                await handleFinalizeSubscription(setupIntent.payment_method);
            } else {
                setPaymentStatus('failed');
                if (onPaymentError) onPaymentError(`Setup failed with status: ${setupIntent.status}`);
            }

        } catch (err) {
            setPaymentStatus('failed');
            if (onPaymentError) onPaymentError(err.message);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
                <label htmlFor="billing-name" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Name on Card
                </label>
                <input
                    id="billing-name"
                    type="text"
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    placeholder="Enter name exactly as it appears on card"
                    required
                    style={{
                        width: '100%',
                        padding: '10px',
                        boxSizing: 'border-box',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        marginBottom: '15px',
                    }}
                />
            </div>
            <div style={{ marginBottom: '15px' }}>
                <label htmlFor="payment-element" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Card Details
                </label>
                <PaymentElement id="payment-element" />
            </div>
            <button
                type="submit"
                disabled={!stripe || !elements || loading || !billingName}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#6772e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    opacity: (!stripe || !elements || loading || !billingName) ? 0.7 : 1,
                }}
            >
                {loading ? 'Processing...' : 'Pay £7.99 (renewed monthly)'}
            </button>

            {paymentStatus === 'succeeded' && <div style={{ color: 'green', marginTop: '10px' }}>Subscription Successful!</div>}
            {paymentStatus === 'failed' && <div style={{ color: 'red', marginTop: '10px' }}>Payment Failed. Please try again.</div>}
            {paymentStatus === 'processing' && <div style={{ color: '#666', marginTop: '10px' }}>Processing payment...</div>}
        </form>
    );
}

export default CheckoutForm;