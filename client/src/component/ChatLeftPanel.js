import { IMAGES_URL } from "../config/config";
import { useNavigate } from "react-router-dom";

export const ChatLeftPanel = ({ chatState, user, userStatus, conversationId }) => {
    const navigate = useNavigate();

    return (
        <div className="rounded-lg p-2 bg-white me-4 w-3/12">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold p-3">Chats</h1>
                <span className="material-symbols-outlined text-stone-800 bg-gray-100 nofill p-2 rounded-full cursor-pointer text-md">
                    edit_square
                </span>
            </div>
            <div className="flex my-4 relative m-3">
                <input
                    type="text"
                    className="flex-grow bg-neutral-100 ps-10 py-2 rounded-3xl focus:outline-none caret-blue-500 w-full"
                    placeholder="Search"
                />
                <span className="material-symbols-outlined absolute text-gray-400 text-xl h-full ms-3 flex items-center">
                    search
                </span>
            </div>
            <div className="flex flex-col">
                {chatState.conversations.map((conv) => {
                    const { conversation } = conv;
                    const { convParticipants, messages, isGroup } = conversation;

                    // Safely get the first participant and message
                    const otherUser = convParticipants[0]?.user;
                    const lastMessage = messages[0];

                    // Determine the display name
                    const displayName = isGroup
                        ? conversation.title
                        : otherUser
                            ? `${otherUser.firstName} ${otherUser.lastName}`
                            : "Unknown User"

                    // Determine the message content
                    const messageContent = lastMessage
                        ? lastMessage.senderId === user.id
                            ? `You: ${lastMessage.content}`
                            : lastMessage.content
                        : "No message yet";

                    return (
                        <div
                            key={conv.conversationId}
                            className={`p-3 flex items-center cursor-pointer hover:bg-gray-100 rounded-md ${conversationId === conv.conversationId ? "bg-gray-100" : ""}`}
                            onClick={() => navigate(`/chat/${conv.conversationId}`)}
                        >
                            <div className="relative flex items-center">
                                <img
                                    className="inline-block size-10 rounded-full ring-0"
                                    src={`${IMAGES_URL}/${isGroup ? conversation?.avatar : otherUser?.avatar}`}
                                    alt={displayName}
                                />
                                {!isGroup && userStatus?.onlineUsers.includes(otherUser?.id) && (
                                    <span className="absolute bottom-0 right-0 block size-3 bg-green-500 border-2 border-white rounded-full"></span>
                                )}
                            </div>
                            <div className="flex flex-col ms-2 flex-1 min-w-0">
                                <p className="text-base font-bold">{displayName}</p>
                                <p className="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap break-all">
                                    {messageContent}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default ChatLeftPanel;