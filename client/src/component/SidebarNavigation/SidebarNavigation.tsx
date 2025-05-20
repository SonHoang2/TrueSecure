import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { MdLogout, MdChatBubble } from 'react-icons/md';

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
                    <div className="absolute bg-white shadow-md rounded-lg bottom-12 ps-2 pe-5 py-4">
                        <div className="flex w-full items-center">
                            <div className="rounded-full bg-gray-50 flex items-center justify-center w-7 h-7">
                                <MdLogout className="text-base text-red-500" />
                            </div>
                            <button
                                onClick={() => logout()}
                                className="whitespace-nowrap text-base ps-3 font-semibold text-red-500"
                            >
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
