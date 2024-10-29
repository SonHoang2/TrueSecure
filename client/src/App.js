import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
    const [message, setMessage] = useState({
        allMessages: [],
        currentMessage: "",
    });

    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
        console.log("connect: ", socket.id);
    });

    const sendMessage = async (e) => {
        e.preventDefault();

        socket.emit("chat", "day la noi dung chat");

    }

    const fetchMessages = async () => {
        const response = await axios.get("http://localhost:5000/messages");
        console.log(response.data);

    }

    return (
        <div className="App">
            <h1>Socket.io</h1>
            <form onSubmit={sendMessage}>
                <input
                    type="text"
                    value={message.currentMessage}
                    onChange={(e) => setMessage(prev => ({ ...prev, currentMessage: e.target.value }))}
                />
                <input type="submit" />
            </form>
        </div>
    );
}

export default App;
