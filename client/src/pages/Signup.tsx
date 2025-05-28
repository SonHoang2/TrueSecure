import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { FaEye } from 'react-icons/fa';
import { IoIosEyeOff } from 'react-icons/io';
import { Routes } from '../enums/routes.enum';
import { AxiosError } from 'axios';
import { extractErrorMessage } from '../utils/errorUtils';

export default function Signup() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        passwordConfirm: '',
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState({
        password: false,
        passwordConfirm: false,
    });
    const { signup } = useAuth();

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signup(formData);
        } catch (err) {
            let message = extractErrorMessage(err, "Signup failed")
            setError(message);
            console.log(err);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const inputFields = [
        {
            id: 'firstName',
            label: 'First name',
            type: 'text',
            placeholder: 'John',
        },
        {
            id: 'lastName',
            label: 'Last name',
            type: 'text',
            placeholder: 'Doe',
        },
        {
            id: 'email',
            label: 'Email address',
            type: 'email',
            placeholder: 'you@example.com',
        },
        {
            id: 'password',
            label: 'Password',
            type: showPassword.password ? 'text' : 'password',
            placeholder: '••••••••',
        },
        {
            id: 'passwordConfirm',
            label: 'Confirm password',
            type: showPassword.passwordConfirm ? 'text' : 'password',
            placeholder: '••••••••',
        },
    ];

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
                        CREATE YOUR ACCOUNT
                    </p>
                    {error && (
                        <div className="text-red-600 font-bold mb-4">
                            {error}. Try again.
                        </div>
                    )}
                    {inputFields.map((field) => (
                        <div
                            key={field.id}
                            className="flex flex-col mb-4 relative"
                        >
                            <label
                                className="font-semibold text-gray-700"
                                htmlFor={field.id}
                            >
                                {field.label}
                            </label>
                            <input
                                className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                                id={field.id}
                                type={field.type}
                                placeholder={field.placeholder}
                                value={formData[field.id]}
                                onChange={handleChange}
                                autoComplete="on"
                                required
                            />
                            {(field.id === 'password' ||
                                field.id === 'passwordConfirm') && (
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
                                    onClick={() =>
                                        togglePasswordVisibility(field.id)
                                    }
                                >
                                    {showPassword[field.id] ? (
                                        <FaEye className="h-5 w-5 text-gray-500" />
                                    ) : (
                                        <IoIosEyeOff className="h-5 w-5 text-gray-500" />
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                    <div className="flex justify-center mb-4">
                        <input
                            type="submit"
                            value="Sign up"
                            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-2 px-4 w-full rounded-md cursor-pointer hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition duration-200"
                        />
                    </div>
                </form>
                <div className="text-center text-gray-600">
                    <p>
                        Already have an account?
                        <Link
                            to={Routes.LOGIN}
                            className="text-blue-500 hover:underline ps-1"
                        >
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
