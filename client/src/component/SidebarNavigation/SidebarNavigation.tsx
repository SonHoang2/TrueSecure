import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { MdLogout, MdChatBubble, MdPerson } from 'react-icons/md';
import { Routes } from '../../enums/routes.enum';
import { Link } from 'react-router-dom';

const SidebarNavigation = () => {
    const [isPopupVisible, setIsPopupVisible] = useState(false);

    const { user, logout } = useAuth();

    return (
        <div className="rounded mx-4 flex flex-col justify-between items-center">
            <div className="rounded-lg p-3 flex align-middle bg-neutral-200">
                <MdChatBubble className="text-xl" />
            </div>
            <div className="relative">
                {isPopupVisible && (
                    <div className="absolute bg-white shadow-md rounded-lg bottom-12 ps-2 pe-5 py-4 min-w-max">
                        <div className="group mb-2">
                            <Link
                                to={Routes.PROFILE}
                                className="flex items-center px-3 py-2 text-md font-medium text-gray-700 rounded-md hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 ease-in-out whitespace-nowrap"
                            >
                                <MdPerson className="text-lg mr-2 text-gray-500 group-hover:text-blue-500 transition-colors duration-200" />
                                Profile
                            </Link>
                        </div>
                        <div className="group">
                            <button
                                onClick={() => logout()}
                                className="flex items-center px-3 py-2 text-md font-medium text-gray-700 rounded-md hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out w-full whitespace-nowrap"
                            >
                                <MdLogout className="text-lg mr-2 text-gray-500 group-hover:text-red-500 transition-colors duration-200" />
                                Log out
                            </button>
                        </div>
                    </div>
                )}

                <div
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => setIsPopupVisible(!isPopupVisible)}
                >
                    <img
                        className="inline-block size-10 rounded-full"
                        src={`${user?.avatar}`}
                        alt="User Avatar"
                    />
                </div>
            </div>
        </div>
    );
};

export default SidebarNavigation;
