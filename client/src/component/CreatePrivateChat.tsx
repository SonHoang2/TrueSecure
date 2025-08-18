import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { CONVERSATIONS_URL } from '../config/config';
import { FaArrowLeft, FaSearch } from 'react-icons/fa';
import debounce from '../utils/debounce';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { User } from '../types/users.types';
import { useAuthUser } from '../hooks/useAuthUser';
import { useAppDispatch } from '../store/hooks';
import { loadConversations } from '../store/slices/conversationSlice';

type CreateChatState = {
    createGroupChat: boolean;
    createPrivateChat: boolean;
};

type CreatePrivateChatProps = {
    setCreateChat: Dispatch<SetStateAction<CreateChatState>>;
    onSearch: (
        searchTerm: string,
        setUsers: Dispatch<SetStateAction<User[]>>,
    ) => Promise<void>;
};

export const CreatePrivateChat: React.FC<CreatePrivateChatProps> = ({
    setCreateChat,
    onSearch,
}) => {
    const user = useAuthUser();
    const dispatch = useAppDispatch();

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

    const axiosPrivate = useAxiosPrivate();

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSubmit = async (
        e: React.MouseEvent<HTMLButtonElement>,
        userId: number,
    ) => {
        try {
            e.preventDefault();

            if (!userId) {
                return;
            }

            await axiosPrivate.post(CONVERSATIONS_URL, {
                users: [userId],
            });

            dispatch(loadConversations());

            setCreateChat((prev) => ({ ...prev, createPrivateChat: false }));
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
            <div className="flex items-center justify-between mb-6 mt-2">
                <button
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    onClick={() =>
                        setCreateChat((prev) => ({
                            ...prev,
                            createPrivateChat: false,
                        }))
                    }
                >
                    <FaArrowLeft size={20} />
                </button>
                <div className="flex-grow mx-4 relative">
                    <input
                        type="text"
                        className="w-full bg-neutral-100 ps-10 py-2 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 caret-blue-500 transition-all duration-200"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch size={20} className="text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <div className="py-3">
                    {filteredUsers?.length > 0 ? (
                        filteredUsers?.map((user: User) => (
                            <button
                                key={user.id}
                                className="w-full flex items-center space-x-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                                onClick={(e) => handleSubmit(e, user.id)}
                            >
                                <div>
                                    <img
                                        src={user.avatar}
                                        alt={user.username}
                                        className="w-10 h-10 rounded-full"
                                    />
                                </div>
                                <span className="text-gray-700 font-medium">
                                    {user.username}
                                </span>
                            </button>
                        ))
                    ) : (
                        <div className="text-gray-500 text-center">
                            Not found user
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatePrivateChat;
