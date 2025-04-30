import { IMAGES_URL, USERS_URL } from "../config/config";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CreateGroupChat from "./CreateGroupChat";
import CreatePrivateChat from "./CreatePrivateChat";
import { FaEdit, FaSearch } from "react-icons/fa";

import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { MdClose } from "react-icons/md";

export const ChatLeftPanel = ({
  chatState,
  user,
  userStatus,
  conversationId,
  setChatState,
}) => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [createChat, setCreateChat] = useState({
    createGroupChat: false,
    createPrivateChat: false,
  });

  const [isCreateChatModalOpen, setCreateChatModalOpen] = useState(false);

  const axiosPrivate = useAxiosPrivate();

  const searchUsers = async (searchTerm, setUsers) => {
    try {
      if (!searchTerm) {
        return;
      }

      const res = await axiosPrivate.get(
        USERS_URL + `/search?name=${searchTerm}`,
      );

      setUsers(res.data.data.users);
    } catch (error) {
      console.log(error);
    }
  };
  const navigate = useNavigate();

  return (
    <div className="rounded-lg p-2 bg-white me-4 w-3/12">
      {!createChat.createGroupChat && !createChat.createPrivateChat && (
        <div>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold p-3">Chats</h1>
            <div className="relative">
              {!isCreateChatModalOpen ? (
                <button onClick={() => setCreateChatModalOpen(true)}>
                  <div className="text-stone-800 p-2 bg-gray-100 rounded-full cursor-pointer">
                    <FaEdit size={20} />
                  </div>
                </button>
              ) : (
                <button onClick={() => setCreateChatModalOpen(false)}>
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
                  : "Unknown User";

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
                    {!isGroup &&
                      userStatus?.onlineUsers.hasOwnProperty(otherUser?.id) && (
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
      )}
      {createChat.createGroupChat && (
        <CreateGroupChat
          setCreateChat={setCreateChat}
          onSearch={searchUsers}
          setChatState={setChatState}
          user={user}
        />
      )}
      {createChat.createPrivateChat && (
        <CreatePrivateChat
          setCreateChat={setCreateChat}
          onSearch={searchUsers}
          setChatState={setChatState}
        />
      )}
    </div>
  );
};

export default ChatLeftPanel;
