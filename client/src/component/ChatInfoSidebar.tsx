import React, { useState } from 'react';
import {
    MdExpandLess,
    MdExpandMore,
    MdBlock,
    MdLogout,
    MdCheck,
    MdClose,
    MdPersonAdd,
    MdDelete,
} from 'react-icons/md';
import { FaArrowLeft, FaRegEdit, FaUserPlus } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { leaveGroup } from '../store/slices/conversationSlice';
import { searchUsers } from '../utils/userUtils';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { USERS_URL } from '../config/config';

interface ChatInfoSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    conversation: any;
    receiver: any;
    participants: any[];
    user: any;
}

const ChatInfoSidebar: React.FC<ChatInfoSidebarProps> = ({
    isOpen,
    onClose,
    conversation,
    receiver,
    participants,
    user,
}) => {
    if (!isOpen) return null;

    const [openSections, setOpenSections] = useState<{
        [key: string]: boolean;
    }>({
        privacy: false,
        chatMembers: false,
        mediaFiles: false,
        addUsers: false,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const axiosPrivate = useAxiosPrivate();

    const dispatch = useDispatch<AppDispatch>();

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const handleLeaveGroup = async () => {
        if (!conversation?.isGroup) return;

        try {
            await dispatch(leaveGroup(conversation.id)).unwrap();
            onClose(); // Close sidebar after leaving
        } catch (error) {
            console.error('Failed to leave group:', error);
            // Handle error (show toast, etc.)
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (user?.role !== 'admin') return;

        try {
            // TODO: Replace with actual API call to remove user from group
            // await dispatch(removeUserFromGroup({ groupId: conversation.id, userId })).unwrap();
            console.log('User removed:', userId);
        } catch (error) {
            console.error('Failed to remove user:', error);
        }
    };

    const handleSearchUsers = async (term: string) => {
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await axiosPrivate.get(
                USERS_URL + `/search?username=${searchTerm}`,
            );

            const filteredResults = res.data.data.users.filter(
                (user: any) =>
                    !participants.some(
                        (participant) => participant.id === user.id,
                    ),
            );

            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Failed to search users:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddUser = async (userId: string) => {
        if (!conversation?.isGroup) return;

        try {
            console.log('add success');
        } catch (error) {
            console.error('Failed to add user:', error);
        }
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

            <div className="flex-1 overflow-y-auto">
                <div className="py-2">
                    {conversation?.isGroup && (
                        <>
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
                                <div>
                                    <div className="py-2">
                                        {participants?.map((participant) => (
                                            <div
                                                key={participant.id}
                                                className="flex items-center justify-between pl-4 pe-5 py-3 rounded-xl hover:bg-gray-50 transition-all duration-150"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <img
                                                        src={participant.avatar}
                                                        alt={`${participant.firstName} ${participant.lastName}`}
                                                        className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm"
                                                    />
                                                    <div>
                                                        <div className="text-base font-semibold text-gray-800">
                                                            {
                                                                participant.firstName
                                                            }{' '}
                                                            {
                                                                participant.lastName
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {participant.role ===
                                                    'admin' ? (
                                                        <span className="text-[11px] px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                                            Admin
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                                                            Member
                                                        </span>
                                                    )}

                                                    {/* Show delete button only if current user is admin and participant is not admin */}
                                                    {user?.role === 'admin' &&
                                                        participant.role !==
                                                            'admin' && (
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveUser(
                                                                        participant.id,
                                                                    )
                                                                }
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Remove user"
                                                            >
                                                                <MdDelete
                                                                    size={18}
                                                                />
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left mt-2"
                                        onClick={() =>
                                            setShowAddUserModal(true)
                                        }
                                    >
                                        <FaUserPlus
                                            className="mr-2"
                                            size={18}
                                        />
                                        <span className="font-medium flex-1 text-left">
                                            Add members
                                        </span>
                                    </button>
                                </div>
                            )}

                            {showAddUserModal && (
                                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fadeIn">
                                        {/* Close Button */}
                                        <button
                                            onClick={() =>
                                                setShowAddUserModal(false)
                                            }
                                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                                        >
                                            <MdClose size={22} />
                                        </button>

                                        {/* Header */}
                                        <h2 className="text-xl font-semibold mb-5 text-center text-gray-800">
                                            Add People
                                        </h2>

                                        {/* Search Box */}
                                        <div className="relative mb-4">
                                            <MdPersonAdd
                                                className="absolute left-3 top-2.5 text-gray-400"
                                                size={20}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Type a username..."
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(
                                                        e.target.value,
                                                    );
                                                    handleSearchUsers(
                                                        e.target.value,
                                                    );
                                                }}
                                                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                            />
                                        </div>

                                        {/* Results / Suggestions */}
                                        <div className="mb-5">
                                            {isSearching ? (
                                                <div className="text-center text-sm text-gray-500 py-3">
                                                    Searching...
                                                </div>
                                            ) : searchTerm &&
                                              searchResults.length > 0 ? (
                                                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 rounded-md border border-gray-100">
                                                    {searchResults.map(
                                                        (user) => (
                                                            <div
                                                                key={user.id}
                                                                className="flex items-center justify-between p-3 hover:bg-gray-50 transition-all"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <img
                                                                        src={
                                                                            user.avatar
                                                                        }
                                                                        alt={`${user.firstName} ${user.lastName}`}
                                                                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                                                    />
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-800">
                                                                            {
                                                                                user.username
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() =>
                                                                        handleAddUser(
                                                                            user.id,
                                                                        )
                                                                    }
                                                                    className="px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:scale-95 transition-all"
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : searchTerm &&
                                              !isSearching &&
                                              searchResults.length === 0 ? (
                                                <div className="text-center text-sm text-gray-500 py-4">
                                                    No users found
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-400 text-center py-2">
                                                    Type to search users
                                                    <div className="flex flex-wrap gap-2 justify-center mt-3">
                                                        {searchResults
                                                            ?.slice(0, 5)
                                                            .map((user) => (
                                                                <button
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    onClick={() =>
                                                                        handleAddUser(
                                                                            user.id,
                                                                        )
                                                                    }
                                                                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-full hover:bg-gray-50 text-sm text-gray-700 transition-all"
                                                                >
                                                                    <img
                                                                        src={
                                                                            user.avatar
                                                                        }
                                                                        alt={
                                                                            user.firstName
                                                                        }
                                                                        className="w-6 h-6 rounded-full object-cover"
                                                                    />
                                                                    <span>
                                                                        {
                                                                            user.firstName
                                                                        }
                                                                    </span>
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() =>
                                                setShowAddUserModal(false)
                                            }
                                            disabled={
                                                searchResults.length === 0
                                            }
                                            className={`w-full py-2.5 rounded-lg font-semibold transition-all active:scale-95 ${
                                                searchResults.length === 0
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* <button
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
                            Media and files...
                        </div>
                    )} */}

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
                            <button
                                className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-left"
                                onClick={
                                    conversation?.isGroup
                                        ? handleLeaveGroup
                                        : undefined
                                }
                            >
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
