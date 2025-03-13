import { useEffect, useState } from "react";
import { ArrowLeft, X, ArrowRight } from "react-feather";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { CONVERSATIONS_URL, IMAGES_URL, USERS_URL } from "../config/config";
import debounce from "../utils/debounce";
import * as cryptoUtils from "../utils/cryptoUtils";

export const CreateGroupChat = ({ setCreateChat, onSearch, setChatState, user }) => {
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isNewGroupChat, setNewGroupChat] = useState(null);
    const [formData, setFormData] = useState({
        groupName: '',
        groupMembers: [],
        avatar: '',
    });

    const axiosPrivate = useAxiosPrivate();

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
    };

    const handleAddUser = (user) => {
        if (!formData.groupMembers.find(u => u.id === user.id)) {
            setFormData(prev => ({
                ...prev,
                groupMembers: [...prev.groupMembers, user]
            }));
        }
        setSearchTerm('');
    };

    const handleRemoveUser = (userId) => {
        setFormData(prev => (
            {
                ...prev,
                groupMembers: prev.groupMembers.filter(user => user.id !== userId)
            }
        ));
    };

    const handleCrypto = async (conversationId) => {
        const aesKey = await cryptoUtils.generateAesKey();

        for (const otherUser of formData.groupMembers) {    
            const res = await axiosPrivate.get(USERS_URL + `/${otherUser.id}/public-key`);

            const recipientPublicKey = await cryptoUtils.importPublicKey(res.data.data.publicKey);
            const senderPrivateKey = await cryptoUtils.importPrivateKey(user.id);

            const exportedAESKey = await cryptoUtils.exportAESKey(aesKey);
            const encryptedAesKey = await cryptoUtils.encryptAESKeys({ recipientPublicKey, senderPrivateKey, message: exportedAESKey });

            await axiosPrivate.post(CONVERSATIONS_URL + `/key`, {
                groupKey: encryptedAesKey,
                conversationId: conversationId,
                userId: otherUser.id,
            });
        }

        await cryptoUtils.storeGroupKey({ conversationId: conversationId, userId: user.id, groupKey: aesKey });
    };

    const handleSubmit = async (e) => {
        try {
            e.preventDefault();

            if (!formData.groupName.trim()) {
                alert('Group name is required');
                return;
            }

            const { data: { data: { conversation } } } = await axiosPrivate.post(CONVERSATIONS_URL, {
                title: formData.groupName,
                users: formData.groupMembers.map(user => user.id),
                avatar: formData.avatar,
            });

            await handleCrypto(conversation.id);

            const { data: { data: { conversations } } } = await axiosPrivate.get(`${CONVERSATIONS_URL}/me`);

            setChatState(prevState => ({
                ...prevState,
                conversations,
            }));

            setNewGroupChat(false);
            setCreateChat(prev => ({ ...prev, createGroupChat: false }));
        } catch (error) {
            console.error('Error in handleSubmit:', error);
        }
    };

    useEffect(() => {
        const debouncedSearch = debounce(onSearch, 300);

        debouncedSearch(searchTerm, setFilteredUsers);

        return () => {
            debouncedSearch.cancel();
        };
    }, [searchTerm]);

    return (
        <div>
            {!isNewGroupChat ?
                <div>
                    <div className="flex items-center justify-between">
                        <button className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                            onClick={() => setCreateChat(prev => ({ ...prev, createGroupChat: false }))}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold py-3">Add Members</h1>
                        <button
                            className="text-stone-800 p-2 bg-gray-100 rounded-full cursor-pointer"
                            onClick={() => {
                                if (formData.groupMembers.length < 2) {
                                    alert('Select at least 2 users to create a group chat');
                                    return;
                                }
                                setNewGroupChat(true)
                            }}
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-neutral-100 rounded-md">
                        {formData.groupMembers.map((user) => (
                            <div key={user.id} className="flex items-center gap-2 bg-blue-100 px-2 py-1 rounded-full">
                                <span className="text-sm">{user.firstName} {user.lastName}</span>
                                <X
                                    size={20}
                                    className="text-gray-500 hover:text-gray-700 cursor-pointer"
                                    onClick={() => handleRemoveUser(user.id)}
                                />
                            </div>
                        ))}
                        <input
                            type="text"
                            placeholder="Add people..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="focus:outline-none bg-transparent flex-1"
                        />
                    </div>

                    {searchTerm && (
                        <div className="rounded-md">
                            {
                                filteredUsers.length > 0 ?
                                    filteredUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            onClick={() => handleAddUser(user)}
                                            className="py-5 px-3 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                        >
                                            <div>
                                                <img
                                                    src={IMAGES_URL + "/" + user.avatar}
                                                    alt={user.firstName}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.firstName} {user.lastName}</p>
                                            </div>
                                        </div>
                                    )) :
                                    <div className="text-gray-500 text-center">Not found user </div>
                            }
                        </div>
                    )}
                </div> :
                <div >
                    <div className="flex items-center justify-between">
                        <button className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                            onClick={() => setCreateChat(prev => ({ ...prev, createGroupChat: false }))}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold py-3">New Group</h1>
                        <button
                            className="text-stone-800 p-2 bg-gray-100 rounded-full cursor-pointer"
                            onClick={(e) => handleSubmit(e)}
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Group name"
                        value={formData.groupName}
                        onChange={(e) => setFormData(prev => ({ ...prev, groupName: e.target.value }))}
                        className="focus:outline-none bg-neutral-100 w-full p-3 rounded-md mb-4"
                    />
                </div>
            }
        </div>
    );
};

export default CreateGroupChat;