import React, { useState } from 'react';
import {
    MdPeople,
    MdAttachFile,
    MdPrivacyTip,
    MdExpandLess,
    MdExpandMore,
    MdBlock,
    MdLogout,
} from 'react-icons/md';
import { FaArrowLeft, FaRegEdit } from 'react-icons/fa';

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

    const [openSections, setOpenSections] = useState<{
        [key: string]: boolean;
    }>({
        privacy: false,
        chatMembers: false,
        mediaFiles: false,
    });

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    return (
        <div
            className={`rounded-lg p-2 bg-white me-4 overflow-y-auto lg:w-2/6 w-full relative`}
        >
            <button
                onClick={onClose}
                className="absolute top-4 left-4 z-10 p-2 hover:bg-gray-100 rounded-full md:hidden"
            >
                <FaArrowLeft size={20} className="text-gray-600" />
            </button>
            {/* Profile Section */}
            <div className="flex flex-col items-center p-4">
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
                {/* <div className="py-2 border-b">
                    <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                        <span className="mr-3 text-gray-600">
                            <MdPushPin size={20} />
                        </span>
                        <span>View pinned messages</span>
                    </button>
                </div> */}

                {/* <div className="py-2 border-b">
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
                </div> */}

                <div className="py-2">
                    <button
                        className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left"
                        onClick={() => toggleSection('chatMembers')}
                    >
                        <span className="font-medium flex-1 text-left">
                            Chat members
                        </span>
                        <span className="ml-2">
                            {openSections.chatMembers ? (
                                <MdExpandLess size={20} />
                            ) : (
                                <MdExpandMore size={20} />
                            )}
                        </span>
                    </button>
                    {openSections.chatMembers && (
                        <div className="pl-8 py-2 text-gray-600 text-sm">
                            {/* Chat members content here */}
                            Members list...
                        </div>
                    )}

                    <button
                        className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left"
                        onClick={() => toggleSection('mediaFiles')}
                    >
                        <span className="font-medium flex-1 text-left">
                            Media, files and links
                        </span>
                        <span className="ml-2">
                            {openSections.mediaFiles ? (
                                <MdExpandLess size={20} />
                            ) : (
                                <MdExpandMore size={20} />
                            )}
                        </span>
                    </button>
                    {openSections.mediaFiles && (
                        <div className="pl-8 py-2 text-gray-600 text-sm">
                            {/* Media/files content here */}
                            Media and files...
                        </div>
                    )}

                    <button
                        className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left"
                        onClick={() => toggleSection('privacy')}
                    >
                        <span className="font-medium flex-1 text-left">
                            Privacy and support
                        </span>
                        <span className="ml-2">
                            {openSections.privacy ? (
                                <MdExpandLess size={20} />
                            ) : (
                                <MdExpandMore size={20} />
                            )}
                        </span>
                    </button>
                    {openSections.privacy && (
                        <div>
                            <button className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left">
                                <span className="mr-3 text-gray-600">
                                    {conversation?.isGroup ? (
                                        <MdLogout size={20} />
                                    ) : (
                                        <MdBlock size={20} />
                                    )}
                                </span>
                                <span>
                                    {conversation?.isGroup
                                        ? 'Leave group'
                                        : 'Block'}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatInfoSidebar;
