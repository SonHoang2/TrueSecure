import { USERS_URL } from '../config/config';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CreateGroupChat from './CreateGroupChat';
import CreatePrivateChat from './CreatePrivateChat';
import { FaEdit, FaSearch } from 'react-icons/fa';

import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { MdClose } from 'react-icons/md';
import { User, UserStatus } from '../types/users.types';
import { getLastMessageFromIndexedDB } from '../utils/indexedDB';
import { Message } from '../types/messages.types';
import { useConversations } from '../store/hooks';
import { useAuthUser } from '../hooks/useAuthUser';
import { searchUsers } from '../utils/userUtils';

type ChatLeftPanelProps = {
    userStatus: UserStatus;
    conversationId?: number;
};

export const ChatLeftPanel: React.FC<ChatLeftPanelProps> = ({
    userStatus,
    conversationId,
}) => {
    const user = useAuthUser();

    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [createChat, setCreateChat] = useState({
        createGroupChat: false,
        createPrivateChat: false,
    });

    const { conversations } = useConversations();

    const [lastMessages, setLastMessages] = useState<
        Record<string, Message | null>
    >({});

    const [isCreateChatModalOpen, setCreateChatModalOpen] = useState(false);

    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();

    const getSenderName = (participants: any[], senderId: number) => {
        const sender = participants?.find(
            (participant) => participant?.userId === senderId,
        )?.user;
        return sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown';
    };

    const handleNavigateToChat = useCallback(
        (id: number) => {
            navigate(`/chat/${id}`);
        },
        [navigate],
    );

    // Fetch last messages when conversations change
    useEffect(() => {
        const fetchLastMessages = async () => {
            const results: Record<string, Message | null> = {};
            if (conversations) {
                for (const conv of conversations) {
                    results[conv.id] = await getLastMessageFromIndexedDB(
                        conv.id,
                    );
                }
            }

            setLastMessages(results);
        };
        fetchLastMessages();
    }, [conversations]);

    useEffect(() => {
        if (searchTerm) {
            searchUsers(searchTerm, setFilteredUsers, axiosPrivate);
        } else {
            setFilteredUsers([]);
        }
    }, [searchTerm]);

    const processedConversations = useMemo(() => {
        return (
            conversations?.map((conv) => {
                const { participants, isGroup, title, avatar, receiver } = conv;

                const otherUser = receiver;

                const displayName = isGroup
                    ? title
                    : otherUser
                      ? `${otherUser.firstName} ${otherUser.lastName}`
                      : 'Unknown User';

                const lastMessage = lastMessages[conv.id];

                let messageContent = 'No message yet';
                if (lastMessage) {
                    if (lastMessage.senderId === user.id) {
                        messageContent = `You: ${lastMessage.content}`;
                    } else if (isGroup) {
                        const senderName = getSenderName(
                            participants,
                            lastMessage.senderId,
                        );
                        messageContent = `${senderName}: ${lastMessage.content}`;
                    } else {
                        messageContent = lastMessage.content;
                    }
                }

                const isOtherUserOnline =
                    !isGroup &&
                    otherUser?.id &&
                    Array.isArray(userStatus?.onlineUsers) &&
                    userStatus.onlineUsers.includes(otherUser.id);

                return {
                    ...conv,
                    otherUser,
                    displayName,
                    messageContent,
                    isOtherUserOnline,
                    avatarSrc: isGroup ? avatar : otherUser?.avatar,
                    isGroup,
                };
            }) || []
        );
    }, [conversations, lastMessages, user.id, userStatus?.onlineUsers]);

    return (
        <div className="rounded-lg p-2 bg-white h-full w-full">
            {!createChat.createGroupChat && !createChat.createPrivateChat && (
                <div>
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold p-3">Chats</h1>
                        <div className="relative">
                            {!isCreateChatModalOpen ? (
                                <button
                                    onClick={() => setCreateChatModalOpen(true)}
                                >
                                    <div className="text-stone-800 p-2 bg-gray-100 rounded-full cursor-pointer">
                                        <FaEdit size={20} />
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={() =>
                                        setCreateChatModalOpen(false)
                                    }
                                >
                                    <div className="text-stone-800 p-2 bg-gray-100 rounded-full cursor-pointer">
                                        <MdClose size={20} />
                                    </div>
                                </button>
                            )}

                            {isCreateChatModalOpen && (
                                <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={() => {
                                            setCreateChat((prev) => ({
                                                ...prev,
                                                createGroupChat: true,
                                            }));
                                            setCreateChatModalOpen(false);
                                        }}
                                        className="w-full p-5 text-left hover:bg-gray-100 rounded-t-lg whitespace-nowrap"
                                    >
                                        New Group
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCreateChat((prev) => ({
                                                ...prev,
                                                createPrivateChat: true,
                                            }));

                                            setCreateChatModalOpen(false);
                                        }}
                                        className="w-full p-5 text-left hover:bg-gray-100 rounded-b-lg whitespace-nowrap"
                                    >
                                        New Private Chat
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex my-4 relative m-3">
                        <input
                            type="text"
                            className="flex-grow bg-neutral-100 ps-10 py-2 rounded-3xl focus:outline-none caret-blue-500 w-full"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute text-gray-400 text-xl h-full ms-3 flex items-center">
                            <FaSearch size={20} />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        {processedConversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`p-3 flex items-center cursor-pointer hover:bg-gray-100 rounded-md ${
                                    conversationId === conv.id
                                        ? 'bg-gray-100'
                                        : ''
                                }`}
                                onClick={() => handleNavigateToChat(conv.id)}
                            >
                                <div className="relative flex items-center">
                                    <img
                                        className="inline-block size-10 rounded-full ring-0"
                                        src={conv.avatarSrc}
                                        alt={conv.displayName}
                                    />
                                    {conv.isOtherUserOnline && (
                                        <span className="absolute bottom-0 right-0 block size-3 bg-green-500 border-2 border-white rounded-full" />
                                    )}
                                </div>
                                <div className="flex flex-col ms-2 flex-1 min-w-0">
                                    <p className="text-base font-bold">
                                        {conv.displayName}
                                    </p>
                                    <p className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap break-all">
                                        {conv.messageContent}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {createChat.createGroupChat && (
                <CreateGroupChat
                    setCreateChat={setCreateChat}
                    onSearch={searchUsers}
                />
            )}
            {createChat.createPrivateChat && (
                <CreatePrivateChat
                    setCreateChat={setCreateChat}
                    onSearch={searchUsers}
                />
            )}
        </div>
    );
};

export default ChatLeftPanel;
