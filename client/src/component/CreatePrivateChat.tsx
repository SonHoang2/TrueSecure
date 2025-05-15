import { useState, useEffect } from 'react';
import { CONVERSATIONS_URL, IMAGES_URL } from '../config/config';
import { FaArrowLeft, FaSearch } from 'react-icons/fa';
import debounce from '../utils/debounce';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

export const CreatePrivateChat = ({
    users,
    setCreateChat,
    onSearch,
    setChatState,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

    const axiosPrivate = useAxiosPrivate();

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSubmit = async (e, userId) => {
        try {
            e.preventDefault();

            if (!userId) {
                return;
            }

            await axiosPrivate.post(CONVERSATIONS_URL, {
                users: [userId],
            });

            const {
                data: {
                    data: { conversations },
                },
            } = await axiosPrivate.get(`${CONVERSATIONS_URL}/me`);

            setChatState((prevState) => ({
                ...prevState,
                conversations,
            }));

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
                        filteredUsers?.map((user) => (
                            <button
                                key={user.id}
                                className="w-full flex items-center space-x-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                                onClick={(e) => handleSubmit(e, user.id)}
                            >
                                <div>
                                    <img
                                        src={IMAGES_URL + '/' + user.avatar}
                                        alt={user.firstName}
                                        className="w-10 h-10 rounded-full"
                                    />
                                </div>
                                <span className="text-gray-700 font-medium">
                                    {`${user.firstName} ${user.lastName}`}
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
