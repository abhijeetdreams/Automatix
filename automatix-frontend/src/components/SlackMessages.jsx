import React, { useState, useEffect } from 'react';
import slackService from '../services/slackService';

const SlackMessages = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await slackService.fetchMessages();
            setMessages(response.messages);
        } catch (err) {
            setError('Failed to fetch messages');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await slackService.sendMessage(newMessage);
            setNewMessage('');
            fetchMessages(); // Refresh messages
        } catch (err) {
            setError('Failed to send message');
            console.error(err);
        }
    };

    if (loading) return <div>Loading messages...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="slack-messages">
            <div className="messages-container">
                {messages.map((msg) => (
                    <div key={msg.ts} className="message">
                        <strong>{msg.userDetails?.name || 'Unknown User'}</strong>
                        <p>{msg.text}</p>
                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="message-form">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default SlackMessages;
