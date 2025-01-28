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
                from: socket.id,
                text: message,
                time: new Date().toLocaleTimeString(),
            };
            socket.emit("sendMessage", messageData); // Send the message to the server
            setMessages(prevMessages => [...prevMessages, messageData]);
            setMessage("");
        }
    };

    const displayMessages = () => {

        return (
            <div>

            </div>
        )
    }

    return (
        <div className="py-4 flex bg-neutral-100 h-full">
            <div className="rounded mx-4 flex flex-col justify-between">
                <div className="rounded-lg p-3 flex align-middle bg-neutral-200">
                    <span className="material-symbols-outlined text-xl">chat_bubble</span>
                </div>
                <div className="hover:bg-gray-100 cursor-pointer" onClick={() => { alert("Clicked") }}>
                    <img className="inline-block size-10 rounded-full " src="/img/user-avatar-default.jpg" alt="" />
                </div>
            </div>
            <div className="rounded-lg p-3 bg-white me-4 w-1/5">
                <h1 className="text-2xl font-bold">Chats</h1>
            </div>
            <div className="rounded-lg bg-white w-4/5 me-4 flex flex-col">
                <div className="flex justify-between p-3 shadow-md">
                    <div className="flex">
                        <div>
                            <img className="inline-block size-10 rounded-full ring-2 ring-white" src="/img/user-avatar-default.jpg" alt="" />
                        </div>
                        <div className="flex flex-col ms-2">
                            <span className="text-base font-bold">John Doe</span>
                            <span className="text-sm text-gray-500">Active now</span>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="material-symbols-outlined text-blue-500">more_horiz</span>
                    </div>
                </div>

                <div className="flex-grow overflow-auto">
                    {messages.map((msg) => {
                        console.log(msg, socket.id, msg.from === socket.id);
                        if (msg.from === socket.id) {
                            return (
                                <div key={msg.id} className="flex justify-end w-full p-2 ">
                                    <div className="flex max-w-md">
                                        <p className="bg-blue-500 text-white rounded-3xl p-3 break-words max-w-full">{msg.text}</p>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={msg.id} className="flex justify-start w-full p-2 ">
                                <div className="flex max-w-md">
                                    <p className="bg-blue-500 text-white rounded-3xl p-3 break-words max-w-full">{msg.text}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="flex p-1 items-center">
                    <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            add_circle
                        </span>
                    </button>
                    <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            imagesmode
                        </span>
                    </button>
                    <button className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200">
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            gif_box
                        </span>
                    </button>
                    <input
                        type="text"
                        className="flex-grow ms-2 bg-gray-100 px-3 py-2 rounded-3xl focus:outline-none caret-blue-500 me-2"
                        placeholder="Aa"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                sendMessage();
                            }
                        }}
                    />
                    <button
                        className="p-2 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full active:bg-gray-200"
                    >
                        <span className="material-symbols-outlined text-blue-500 text-2xl">
                            thumb_up
                        </span>
                    </button>
                </div>
            </div>
        </div >
    );
};

export default Chat;
