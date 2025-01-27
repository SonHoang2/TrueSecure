import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "../config/config";

const socket = io(SERVER_URL);

const Chat = () => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        // Listen for incoming messages
        socket.on("receiveMessage", (data) => {
            setMessages((prevMessages) => [...prevMessages, data]);
        });

        return () => {
            socket.off("receiveMessage");
        };
    }, []);

    const sendMessage = () => {
        if (message.trim()) {
            const messageData = {
                id: Date.now(),
                text: message,
                time: new Date().toLocaleTimeString(),
            };
            socket.emit("sendMessage", messageData); // Send the message to the server
            setMessages(prevMessages => [...prevMessages, messageData]);
            setMessage("");
        }
    };

    return (
        <div className="chat-container">
            <div className="messages">
                {messages.map((msg) => (
                    <div key={msg.id} className="message">
                        <span>{msg.text}</span>
                        <small>{msg.time}</small>
                    </div>
                ))}
            </div>
            <div className="input-container">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
};

export default Chat;
