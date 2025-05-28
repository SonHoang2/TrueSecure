import React from 'react';
import {
    MdClose,
    MdPushPin,
    MdEdit,
    MdPhoto,
    MdPalette,
    MdEmojiEmotions,
    MdPeople,
    MdAttachFile,
    MdPrivacyTip,
} from 'react-icons/md';
import { FaRegEdit } from 'react-icons/fa';

interface ChatInfoSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    conversation: any;
    receiver: any;
}

const ChatInfoSidebar: React.FC<ChatInfoSidebarProps> = ({
    isOpen,
    onClose,
    conversation,
    receiver,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="rounded-lg p-2 bg-white me-4 w-3/12"
        >
            {/* Profile Section */}
            <div className="flex flex-col items-center p-4 border-b">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-3">
                    <img
                        src={
                            conversation?.isGroup
                                ? conversation?.avatar
                                : receiver?.avatar
                        }
                        alt={
                            conversation?.isGroup
                                ? conversation?.title
                                : `${receiver?.firstName} ${receiver?.lastName}`
                        }
                        className="w-full h-full object-cover"
                    />
                </div>
                <h3 className="text-xl font-bold">
                    {conversation?.isGroup
                        ? conversation?.title
                        : `${receiver?.firstName} ${receiver?.lastName}`}
                </h3>
                <p className="text-gray-500 text-sm">
                    {conversation?.isGroup
                        ? `${conversation.participants?.length || 0} members`
                        : 'Active now'}
                </p>
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto">
                <div className="py-2 border-b">
                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdPushPin size={20} />
                        </span>
                        <span>View pinned messages</span>
                    </button>
                </div>

                <div className="py-2 border-b">
                    <h3 className="text-sm font-medium px-4 py-2 text-gray-500">
                        Customise chat
                    </h3>

                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdEdit size={20} />
                        </span>
                        <span>Change chat name</span>
                    </button>

                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdPhoto size={20} />
                        </span>
                        <span>Change photo</span>
                    </button>

                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdPalette size={20} />
                        </span>
                        <span>Change theme</span>
                    </button>

                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdEmojiEmotions size={20} />
                        </span>
                        <span>Change emoji</span>
                    </button>

                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <FaRegEdit size={20} />
                        </span>
                        <span>Edit nicknames</span>
                    </button>
                </div>

                <div className="py-2">
                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdPeople size={20} />
                        </span>
                        <span>Chat members</span>
                    </button>

                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdAttachFile size={20} />
                        </span>
                        <span>Media, files and links</span>
                    </button>

                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdPrivacyTip size={20} />
                        </span>
                        <span>Privacy and support</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatInfoSidebar;
