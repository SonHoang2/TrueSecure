import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "react-feather";
import { ROUTES } from "../config/config";

export default function Signup() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState({
        password: false,
        passwordConfirm: false,
    });
    const navigate = useNavigate();
    const { user, signup } = useAuth();

    const handleSubmit = async (e) => {
        try {
            e.preventDefault();
            await signup({ firstName, lastName, email, password, passwordConfirm });
        } catch (err) {
            setError(err.message);
            console.log(err);
        }
    };

    return (
        <div
            className="h-screen flex justify-center items-center"
            style={{
                backgroundImage: `url('/img/background.png')`,
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
                        <div className="text-red-600 font-bold mb-4">{error}. Try again.</div>
                    )}
                    <div className="flex flex-col mb-4">
                        <label className="font-semibold text-gray-700" htmlFor="name">
                            First name
                        </label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            id="name"
                            type="text"
                            placeholder="John"
                            onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="on"
                            required
                        />
                    </div>
                    <div className="flex flex-col mb-4">
                        <label className="font-semibold text-gray-700" htmlFor="name">
                            Last name
                        </label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            id="name"
                            type="text"
                            placeholder="Doe"
                            onChange={(e) => setLastName(e.target.value)}
                            autoComplete="on"
                            required
                        />
                    </div>
                    <div className="flex flex-col mb-4">
                        <label className="font-semibold text-gray-700" htmlFor="email">
                            Email address
                        </label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="on"
                            required
                        />
                    </div>
                    <div className="flex flex-col mb-4 relative">
                        <label className="font-semibold text-gray-700" htmlFor="password">
                            Password
                        </label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                            id="password"
                            type={showPassword.password ? "text" : "password"}
                            placeholder="••••••••"
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="on"
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
                            onClick={() => setShowPassword(prev => {
                                return { ...prev, password: !prev.password };
                            })}
                        >
                            {showPassword.password ?
                                (
                                    <Eye className="h-5 w-5 text-gray-500" />
                                ) :
                                (
                                    <EyeOff className="h-5 w-5 text-gray-500" />
                                )
                            }
                        </button>
                    </div>
                    <div className="flex flex-col mb-6 relative">
                        <label className="font-semibold text-gray-700" htmlFor="passwordConfirm">
                            Confirm password
                        </label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                            id="passwordConfirm"
                            type={showPassword.passwordConfirm ? "text" : "password"}
                            placeholder="••••••••"
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            autoComplete="on"
                            required
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 mt-6"
                            onClick={() => setShowPassword(prev => {
                                return { ...prev, passwordConfirm: !prev.passwordConfirm };
                            })}
                        >
                            {showPassword.passwordConfirm ?
                                (
                                    <Eye className="h-5 w-5 text-gray-500" />
                                ) :
                                (
                                    <EyeOff className="h-5 w-5 text-gray-500" />
                                )
                            }
                        </button>
                    </div>
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
                        <Link to={ROUTES.LOGIN} className="text-blue-500 hover:underline ps-1">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}