import { useState } from "react";
import { ArrowLeft, X, ArrowRight } from "react-feather";

export const CreateGroupChat = ({ users, setCreateChat }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isNewGroupChat, setNewGroupChat] = useState(null);
    const [formData, setFormData] = useState({
        groupName: '',
        groupMembers: [],
        avatar: '',
    });

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleAddUser = (user) => {
        if (!formData.groupMembers.find(u => u.id === user.id)) {
            setFormData(prev => ({
                ...prev, 
                groupMembers: [ ...prev.groupMembers, user]
            }));
        }
        setSearchTerm('');
    };

    const handleRemoveUser = (userId) => {
        setFormData(prev => prev.groupMembers.filter(user => user.id !== userId));
    };

    const filteredUsers = users.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e) => {
        e.preventDefault();

        if (formData.groupName === '') {
            alert('Group name is required');
            return;
        }

        console.log(formData);
        

        setNewGroupChat(false);
        setCreateChat(prev => ({ ...prev, createGroupChat: false }));
    }

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
                                    size={16}
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
                                        <p
                                            key={user.id}
                                            onClick={() => handleAddUser(user)}
                                            className="py-5 px-3 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                                {user.firstName[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.firstName} {user.lastName}</p>
                                            </div>
                                        </p>
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