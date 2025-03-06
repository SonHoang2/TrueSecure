import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../config/config";
import { Eye, EyeOff } from "react-feather";

export default function Login() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState({
        password: false,
        passwordConfirm: false,
    });
    
    const { login } = useAuth();

    const handleSubmit = async (event) => {
        try {
            event.preventDefault();
            await login(formData);
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
                    <p className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text text-3xl font-semibold text-center mb-6">LOGIN TO YOUR ACCOUNT</p>
                    {error && (
                        <div className="alert alert-danger text-red-600 font-bold mb-4">{error}. Try again.</div>
                    )}
                    <div className="flex flex-col mb-4">
                        <label className="font-semibold text-gray-700" htmlFor="email">Email address</label>
                        <input
                            className="form-input py-2 px-4 border rounded-md bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            onChange={e => setFormData(prev => {
                                return { ...prev, email: e.target.value };
                            })}
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
                            onChange={(e) => setFormData(
                                prev => ({ ...prev, password: e.target.value })
                            )}
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
                    <div className="flex justify-end mb-4">
                        <Link to='/user/forgotPassword' className="text-sm text-blue-500 hover:underline">Forgot password?</Link>
                    </div>
                    <div className="flex justify-center mb-4">
                        <input
                            type="submit"
                            value="Login"
                            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-2 px-4 w-full rounded-md cursor-pointer hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition duration-200"
                        />
                    </div>
                </form>
                {/* <div className="text-center text-gray-600 mb-4">
                    <p>Or login with a social account</p>
                </div>
                <div className="flex flex-col my-3">
                    <div
                        className="btn border shadow-sm flex items-center w-full mb-3 py-2 px-4 rounded-md cursor-pointer hover:bg-gray-200"
                        onClick={getGoogleCode}
                    >
                        <img src="/img/google-icon.png" alt="google" className="w-6 h-6" />
                        <span className="ml-3">Sign in with Google</span>
                    </div>
                </div> */}
                <div className="text-center text-gray-600">
                    <p>Don't have an account?
                        <Link to={ROUTES.SIGN_UP} className="text-blue-500 hover:underline ps-1">Signup</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
