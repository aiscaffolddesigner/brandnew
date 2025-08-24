// App.jsx
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import UpgradePage from './pages/UpgradePage';

const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

function App() {
    const {
        user,
        isAuthenticated,
        isLoading,
        loginWithRedirect,
        logout,
        getAccessTokenSilently,
    } = useAuth0();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [threadId, setThreadId] = useState(null);
    const [error, setError] = useState(null);
    const [userPlan, setUserPlan] = useState(null);
    const [trialDaysRemaining, setTrialDaysRemaining] = useState(null);
    const [showUpgradeForm, setShowUpgradeForm] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [threadCount, setThreadCount] = useState(0); // New state for thread count

    // This effect checks the URL for payment success or failure
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const payment = urlParams.get('payment');
        if (payment === 'success') {
            setPaymentStatus('success');
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchUserPlan();
        } else if (payment === 'cancelled') {
            setPaymentStatus('cancelled');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const fetchUserPlan = async () => {
        if (!isAuthenticated) {
            setUserPlan(null);
            setTrialDaysRemaining(null);
            setThreadCount(0); // Reset thread count on logout
            return;
        }

        setUserPlan('loading');
        try {
            const accessToken = await getAccessTokenSilently({
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            });
            const res = await fetch(`${API_BASE_URL}/api/user-status`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(`Failed to fetch user status: ${res.status}, Details: ${errorData.error || 'Unknown error'}`);
            }

            const data = await res.json();
            setUserPlan(data.planStatus);
            setThreadCount(data.threadCount || 0); // Set the thread count here
            console.log('User plan status fetched:', data.planStatus, 'Trial ends:', data.trialEndsAt, 'Thread count:', data.threadCount);

            if (data.planStatus === 'trial' && data.trialEndsAt) {
                const trialEndDate = new Date(data.trialEndsAt);
                const now = new Date();
                const diffTime = trialEndDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setTrialDaysRemaining(diffDays);
                console.log(`Trial days remaining: ${diffDays}`);
            } else {
                setTrialDaysRemaining(null);
            }

        } catch (err) {
            console.error('Error fetching user plan:', err);
            setError(`Could not fetch user plan details: ${err.message}`);
            setUserPlan('error');
        }
    };

    useEffect(() => {
        fetchUserPlan();
    }, [isAuthenticated, getAccessTokenSilently, API_BASE_URL]);

    useEffect(() => {
        const createNewThread = async () => {
            if (!isAuthenticated || threadId || chatLoading || userPlan === null || userPlan === 'error' || userPlan === 'expired' || (userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0)) {
                console.log("Skipping new thread creation due to current state:", { isAuthenticated, threadId, chatLoading, userPlan, trialDaysRemaining });
                return;
            }
            if (userPlan === 'loading') {
                console.log("User plan still loading, deferring thread creation.");
                return;
            }

            // Check if trial user has reached the thread limit
            if (userPlan === 'trial' && threadCount >= 10) {
                setError('You have reached your thread limit of 10. Please upgrade your plan.');
                return;
            }

            try {
                setChatLoading(true);
                setError(null);
                const accessToken = await getAccessTokenSilently();

                const res = await fetch(`${API_BASE_URL}/api/new-thread`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });
                
                // Specific handling for 403 Forbidden error from backend
                if (res.status === 403) {
                    const errorData = await res.json();
                    setError(errorData.error);
                    setChatLoading(false);
                    return; // Stop execution
                }

                if (!res.ok) {
                    const errorData = await res.json();
                    let errorMessage = `HTTP error! Status: ${res.status}`;
                    if (errorData.error) errorMessage += `, Details: ${errorData.error}`;
                    if (errorData.planStatus) {
                        setUserPlan(errorData.planStatus);
                        errorMessage = errorData.error;
                    }
                    throw new Error(errorMessage);
                }

                const data = await res.json();
                setThreadId(data.threadId);
                setThreadCount(prevCount => prevCount + 1); // Increment local thread count
                console.log('New thread created:', data.threadId);
                setMessages([{ role: 'assistant', content: 'Hello! How can I help you today?' }]);
            } catch (err) {
                console.error('Error creating new thread:', err);
                let displayError = `Failed to start chat: ${err.message}.`;
                if (err.message.includes('403')) {
                    displayError = 'You have reached your thread limit or your plan is invalid. Please upgrade to continue.';
                } else if (err.message.includes('401')) {
                    displayError = 'You are not authorized. Please log in again.';
                }
                setError(displayError);
            } finally {
                setChatLoading(false);
            }
        };

        if (isAuthenticated && !threadId && !chatLoading && userPlan !== null && userPlan !== 'loading' && userPlan !== 'error') {
            createNewThread();
        }
    }, [isAuthenticated, getAccessTokenSilently, threadId, chatLoading, userPlan, threadCount, trialDaysRemaining, API_BASE_URL]);

    const sendMessage = async () => {
        const isChatDisabled = userPlan === 'expired' || (userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0);

        if (!input.trim() || !threadId || isChatDisabled) {
            if (isChatDisabled) {
                setError('Your plan does not allow sending messages. Please upgrade.');
            } else if (!threadId) {
                setError('Chat not initialized. Please wait or refresh the page.');
            }
            return;
        }

        const userMessage = { role: 'user', content: input.trim() };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInput('');
        setChatLoading(true);
        setError(null);

        try {
            const accessToken = await getAccessTokenSilently();

            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ threadId: threadId, message: userMessage.content }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                let errorMessage = `HTTP error! Status: ${res.status}`;
                if (errorData.error) errorMessage += `, Details: ${errorData.error}`;
                if (errorData.planStatus) {
                    setUserPlan(errorData.planStatus);
                    errorMessage = errorData.error;
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            const aiReply = data.response || 'No response from assistant.';

            setMessages(prevMessages => [
                ...prevMessages,
                { role: 'assistant', content: aiReply },
            ]);

        } catch (err) {
            console.error('Error sending message:', err);
            let displayError = `Failed to get response: ${err.message}`;
            if (err.message.includes('403') && (userPlan === 'expired' || (userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0))) {
                displayError = 'Your trial has expired or access is denied. Please upgrade to continue.';
            } else if (err.message.includes('401')) {
                displayError = 'You are not authorized. Please log in again.';
            }
            setError(displayError);
            setMessages(prevMessages => [
                ...prevMessages,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        console.log('Payment successful!');
        setShowUpgradeForm(false);
        fetchUserPlan();
        setError(null);
    };

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading authentication...</div>;
    }

    if (isAuthenticated && showUpgradeForm) {
        return (
            <div style={{ maxWidth: 600, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
                <UpgradePage />
                <button onClick={() => setShowUpgradeForm(false)} style={{ marginTop: '20px', padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Back to Chat
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h1 style={{ textAlign: 'center', color: '#333' }}>AIScaffoldDesigner Chat</h1>
            {!isAuthenticated ? (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <p>Please log in to start chatting.</p>
                    <button onClick={() => loginWithRedirect()} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Log In</button>
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <p>Welcome, {user.name || user.email}!</p>
                    <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Log Out</button>
                </div>
            )}
            {isAuthenticated && (
                <>
                    {paymentStatus === 'success' && <div style={{ color: 'white', backgroundColor: '#28a745', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>**Payment successful!** You are now a premium user.</div>}
                    {paymentStatus === 'cancelled' && <div style={{ color: 'white', backgroundColor: '#dc3545', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>**Payment cancelled.** You have not been charged.</div>}
                    {error && <div style={{ color: 'white', backgroundColor: '#dc3545', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}><strong>Error:</strong> {error}</div>}
                    {userPlan === 'loading' && <div style={{ backgroundColor: '#e0e0e0', color: '#333', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>Checking your plan status...</div>}
                    {userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining > 0 && <div style={{ backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>You are on a free trial! **{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.**{' '}<a href="#" onClick={(e) => { e.preventDefault(); setShowUpgradeForm(true); }} style={{ color: '#007bff', textDecoration: 'underline' }}>Upgrade now</a></div>}
                    {userPlan === 'trial' && <div style={{ backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>**Threads used: {threadCount} / 10**</div>}
                    {(userPlan === 'expired' || (userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0)) && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>Your trial has expired. Please{' '}<a href="#" onClick={(e) => { e.preventDefault(); setShowUpgradeForm(true); }} style={{ color: '#dc3545', textDecoration: 'underline' }}>upgrade to a premium plan</a> to continue.</div>}
                    {userPlan === 'premium' && <div style={{ backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>You are a premium user. Enjoy!</div>}
                    {userPlan === 'error' && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>Failed to load your plan status. Please refresh or contact support.</div>}
                    <div style={{ border: '1px solid #eee', padding: 15, minHeight: 350, maxHeight: 500, overflowY: 'auto', marginBottom: 15, borderRadius: '8px', backgroundColor: '#fff' }}>
                        {messages.length === 0 && !chatLoading && !error && (
                            <div style={{ textAlign: 'center', color: '#666', marginTop: '20%' }}>
                                {threadId ? 'Type your first message below!' : 'Initializing chat...'}
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                                <div style={{ maxWidth: '80%', padding: '10px 15px', borderRadius: '18px', backgroundColor: msg.role === 'user' ? '#007bff' : '#e2e6ea', color: msg.role === 'user' ? 'white' : '#333', wordWrap: 'break-word', whiteSpace: 'pre-wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderBottomRightRadius: msg.role === 'user' ? '2px' : '18px', borderBottomLeftRadius: msg.role === 'user' ? '18px' : '2px' }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {chatLoading && <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>Thinking...</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !chatLoading && threadId && sendMessage()}
                            style={{ flexGrow: 1, padding: '10px 15px', border: '1px solid #ccc', borderRadius: '20px', fontSize: '16px', outline: 'none' }}
                            disabled={chatLoading || !threadId || userPlan === 'expired' || (userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0) || userPlan === 'error' || userPlan === 'loading' || (userPlan === 'trial' && threadCount >= 10)}
                            placeholder={userPlan === 'loading' ? "Checking plan status..." : (userPlan === 'expired' || (userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0) || (userPlan === 'trial' && threadCount >= 10)) ? "Please upgrade to continue chatting." : (threadId ? "Type your message..." : "Initializing chat...")}
                        />
                        <button onClick={sendMessage} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'} disabled={chatLoading || !threadId || !input.trim() || userPlan === 'expired' || (userPlan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0) || userPlan === 'error' || userPlan === 'loading' || (userPlan === 'trial' && threadCount >= 10)}>
                            Send
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;