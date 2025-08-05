import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Routes } from '../enums/routes.enum';
import { FaEye } from 'react-icons/fa';
import { IoIosEyeOff } from 'react-icons/io';
import queryString from 'query-string';
import { extractErrorMessage } from '../utils/errorUtils';

export default function Login() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState({
        password: false,
        passwordConfirm: false,
    });

    const location = useLocation();

    const { login, getGoogleCode, sendGoogleCode } = useAuth();

    const handleAuthRedirect = async () => {
        try {
            const { code } = queryString.parse(location.search);

            if (location.pathname === '/auth/google') {
                await sendGoogleCode(code);
            }
        } catch (error) {
            console.error('Error fetching auth data:', error);
        }
    };

    const handleSubmit = async (event) => {
        try {
            event.preventDefault();
            await login(formData);
        } catch (err) {
            let message = extractErrorMessage(err, 'Login failed.');
            setError(message);
            console.log(err);
        }
    };

    useEffect(() => {
        console.log(location.pathname);
        handleAuthRedirect();
    }, [location.pathname]);

    return (
        <div
            className="h-screen flex justify-center items-center"
            style={{
                backgroundImage: `url('/assets/img/background.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div className="shadow-lg border px-6 py-8 bg-white rounded-lg w-96">
                <form onSubmit={handleSubmit}>
                    <p className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text text-3xl font-semibold text-center mb-6">
                        LOGIN TO YOUR ACCOUNT
                    </p>
                    {error && (
                        <div className="alert alert-danger text-red-600 font-bold mb-4">
                            {error}. Try again.
                        </div>
                    )}
                    <div className="flex flex-col mb-4">
                        <label
                            className="font-semibold text-gray-700"
                            htmlFor="username"
                        >
                            Username
                        </label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            id="username"
                            type="text"
                            placeholder="username"
                            onChange={(e) =>
                                setFormData((prev) => {
                                    return { ...prev, username: e.target.value };
                                })
                            }
                            autoComplete="on"
                            required
                        />
                    </div>
                    <div className="flex flex-col mb-4 relative">
                        <label
                            className="font-semibold text-gray-700"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                            id="password"
                            type={showPassword.password ? 'text' : 'password'}
                            placeholder="••••••••"
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    password: e.target.value,
                                }))
                            }
                            autoComplete="on"
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
                            onClick={() =>
                                setShowPassword((prev) => {
                                    return {
                                        ...prev,
                                        password: !prev.password,
                                    };
                                })
                            }
                        >
                            {showPassword.password ? (
                                <FaEye className="h-5 w-5 text-gray-500" />
                            ) : (
                                <IoIosEyeOff className="h-5 w-5 text-gray-500" />
                            )}
                        </button>
                    </div>
                    <div className="flex justify-end mb-4">
                        <Link
                            to="/user/forgotPassword"
                            className="text-sm text-blue-500 hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="flex justify-center mb-4">
                        <input
                            type="submit"
                            value="Login"
                            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-2 px-4 w-full rounded-md cursor-pointer hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition duration-200"
                        />
                    </div>
                </form>
                <div className="text-center text-gray-600">
                    <p>Or login with a social account</p>
                </div>
                <div className="flex justify-center mt-2 mb-10">
                    <div
                        className="btn border border-gray-300 shadow-sm flex justify-center items-center w-10 h-10 p-1 rounded-full cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:shadow-md hover:border-gray-400"
                        onClick={getGoogleCode}
                    >
                        <img
                            src="/assets/img/google_logo.svg"
                            alt="Google sign-in"
                            className="w-6 h-6 transition-transform duration-200 hover:scale-105"
                        />
                    </div>
                </div>
                <div className="text-center text-gray-600">
                    <p>
                        Don't have an account?
                        <Link
                            to={Routes.SIGN_UP}
                            className="text-blue-500 hover:underline ps-1"
                        >
                            Signup
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
