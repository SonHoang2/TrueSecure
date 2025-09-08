import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';
import {
    MdPerson,
    MdEmail,
    MdEdit,
    MdSave,
    MdCancel,
    MdAdminPanelSettings,
    MdCameraAlt,
} from 'react-icons/md';
import { FaGoogle } from 'react-icons/fa';
import { AppRole } from '../enums/roles.enum';
import { USERS_URL } from '../config/config';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

const Profile = () => {
    const { user } = useAuth();
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: user?.id || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        username: user?.username || '',
        email: user?.email || '',
        avatar: user?.avatar || '',
        googleAccount: user?.googleAccount || false,
        role: user?.role || 'user',
    });
    const axiosPrivate = useAxiosPrivate();

    const fetchUserData = async () => {
        try {
            const url = `${USERS_URL}/me`;
            const res = await axiosPrivate.get(url);
            const fetchedUser = res.data.data || res.data;
            setFormData((prev) => ({ ...prev, ...fetchedUser }));
            dispatch(setUser(fetchedUser));
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : value,
        }));
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const url = `${USERS_URL}/me`;
            const res = await axiosPrivate.patch(url, formData);

            // Update both local state and auth context
            const updatedUser = res.data.data || res.data;
            setFormData((prev) => ({ ...prev, ...updatedUser }));
            dispatch(setUser(updatedUser));

            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            // You might want to show an error toast here
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            id: user?.id || '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            username: user?.username || '',
            email: user?.email || '',
            avatar: user?.avatar || '',
            googleAccount: user?.googleAccount || false,
            role: user?.role || 'user',
        });
        setIsEditing(false);
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin':
                return <MdAdminPanelSettings className="text-red-500" />;
            default:
                return <MdPerson className="text-blue-500" />;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case AppRole.ADMIN:
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        Profile Settings
                    </h1>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Cover Header */}
                    <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                        <div className="absolute top-4 right-4">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
                                >
                                    <MdEdit className="text-lg" />
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
                                    >
                                        <MdSave className="text-lg" />
                                        {isLoading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
                                    >
                                        <MdCancel className="text-lg" />
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative px-8 pb-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-8 mb-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                                    {formData.avatar ? (
                                        <img
                                            src={formData.avatar}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <MdPerson className="text-5xl" />
                                        </div>
                                    )}
                                </div>
                                {isEditing && (
                                    <button className="absolute bottom-2 right-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all duration-200">
                                        <MdCameraAlt className="text-lg" />
                                    </button>
                                )}
                            </div>

                            <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left">
                                <h2 className="text-3xl font-bold text-gray-800">
                                    {formData.username}
                                </h2>
                                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                                    <span
                                        className={`px-3 py-1 rounded-full text-md font-medium border ${getRoleColor(formData.role)} flex items-center gap-1`}
                                    >
                                        {getRoleIcon(formData.role)}
                                        {formData.role.charAt(0).toUpperCase() +
                                            formData.role.slice(1)}
                                    </span>
                                    {formData.googleAccount && (
                                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-md font-medium border border-green-200 flex items-center gap-1">
                                            <FaGoogle className="text-md" />
                                            Google
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="text-md font-semibold text-gray-700 flex items-center gap-2">
                                    <MdPerson className="text-gray-500" />
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                        isEditing
                                            ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                                            : 'border-gray-200 bg-gray-50 text-gray-600'
                                    }`}
                                />
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="text-md font-semibold text-gray-700 flex items-center gap-2">
                                    <MdPerson className="text-gray-500" />
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                        isEditing
                                            ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                                            : 'border-gray-200 bg-gray-50 text-gray-600'
                                    }`}
                                />
                            </div>

                            {/* Username */}
                            <div className="space-y-2">
                                <label className="text-md font-semibold text-gray-700 flex items-center gap-2">
                                    <MdPerson className="text-gray-500" />
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                        isEditing
                                            ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                                            : 'border-gray-200 bg-gray-50 text-gray-600'
                                    }`}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-md font-semibold text-gray-700 flex items-center gap-2">
                                    <MdEmail className="text-gray-500" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 ${
                                        isEditing
                                            ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                                            : 'border-gray-200 bg-gray-50 text-gray-600'
                                    }`}
                                />
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <label className="text-md font-semibold text-gray-700 flex items-center gap-2">
                                    {getRoleIcon(formData.role)}
                                    Role
                                </label>
                                <div className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg flex items-center gap-2">
                                    {getRoleIcon(formData.role)}
                                    <span className="capitalize">
                                        {formData.role}
                                    </span>
                                </div>
                            </div>

                            {/* Google Account */}
                            {/* <div className="md:col-span-2 space-y-2">
                                <label className="text-md font-semibold text-gray-700 flex items-center gap-2">
                                    <FaGoogle className="text-gray-500" />
                                    Google Account Integration
                                </label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="googleAccount"
                                            checked={formData.googleAccount}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <span className="text-gray-700">
                                            {formData.googleAccount
                                                ? 'Connected'
                                                : 'Not Connected'}
                                        </span>
                                        {formData.googleAccount && (
                                            <MdVerified className="text-green-500 text-lg" />
                                        )}
                                    </label>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>

                {/* Additional Info Card */}
                <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        Account Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                Free
                            </div>
                            <div className="text-md text-gray-600">
                                Account Level
                            </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {user?.active ? 'Active' : 'Inactive'}
                            </div>
                            <div className="text-md text-gray-600">Status</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {new Date(
                                    user?.createdAt || '',
                                ).getFullYear() || 'N/A'}
                            </div>
                            <div className="text-md text-gray-600">
                                Member Since
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
