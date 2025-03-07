import { useState } from "react";
import { ROUTES } from "../config/config";
import { Search, ArrowLeft } from "react-feather";

export const CreatePrivateChat = ({ users, setCreateChat }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

    };

    const filteredUsers = users.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-6">
                    <button className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        onClick={() => setCreateChat(prev => ({ ...prev, createPrivateChat: false }))}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-grow mx-4 relative">
                        <input
                            type="text"
                            className="w-full bg-neutral-100 ps-10 py-2 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500 caret-blue-500 transition-all duration-200"
                            placeholder="Search"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={20} className="text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="space-y-2">
                        {filteredUsers.map(user => (
                            <button
                                key={user.id}
                                className="w-full flex items-center space-x-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors duration-200"
                            >
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                                    {user.firstName[0]}
                                </div>
                                <span className="text-gray-700 font-medium">
                                    {`${user.firstName} ${user.lastName}`}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreatePrivateChat;