import { useNavigate, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import queryString from "query-string";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const location = useLocation();
    const navigate = useNavigate();
    const { user, login, getGoogleCode, sendGoogleCode } = useAuth();

    const handleSubmit = async event => {
        try {
            event.preventDefault();

            await login({ email, password });

        } catch (err) {
            setError(err.message);
            console.log(err);
        }
    }

    // google login
    const handleAuthRedirect = async () => {
        try {
            console.log(location.pathname);
            const { code } = queryString.parse(location.search);
            if (location.pathname === "/auth/google") {
                sendGoogleCode(code);
            }
        } catch (error) {
            console.error('Error fetching auth data:', error);
        }
    };

    useEffect(() => {
        // login with social account
        handleAuthRedirect()

        if (user) {
            navigate("/");
        }

    }, [location.pathname]);


    return (
        <div className="h-100">
            <div
                className="d-flex justify-content-center align-items-center w-100 h-100 bg-body-secondary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="shadow border px-5 py-4 bg-white rounded w-400">
                    <form onSubmit={handleSubmit}>
                        <p className="text-success pb-4 fs-3 fw-bold text-center">LOGIN TO YOUR ACCOUNT</p>
                        {
                            error &&
                            <div className="alert alert-danger fw-bold" role="alert">{error}. Try again.</div>
                        }
                        <div className="d-flex flex-column pb-3">
                            <label className="form-label fw-bold" htmlFor="email">Email address</label>
                            <input
                                className="form-control border-0 bg-body-secondary shadow-none"
                                id="email"
                                type="text"
                                placeholder="you@example.com"
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="on"
                                required
                            />
                        </div>
                        <div className="d-flex flex-column pb-3">
                            <label className="form-label fw-bold" htmlFor="password">Password</label>
                            <input
                                className="form-control border-0 bg-body-secondary shadow-none"
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="on"
                                required
                            />
                        </div>
                        <div className="d-flex justify-content-end">
                            <Link to='/user/forgotPassword' className='mx-2'>Forgot password?</Link>
                        </div>
                        <div className="d-flex justify-content-center mt-3">
                            <input
                                whileHover={{ opacity: 0.8 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                value="Login"
                                className="bg-success text-white border py-3 w-100 rounded"
                            />
                        </div>
                    </form>
                    <div className="d-flex justify-content-center mt-3">
                        <p className="text-center text-secondary">Or login with social accout</p>
                    </div>
                    <div className="d-flex my-3 flex-column">
                        <div className="btn border shadow-sm  w-100 d-flex align-items-center mb-3" onClick={getGoogleCode}>
                            <img src="/img/google-icon.png" alt="google" />
                            <span className="ps-2">Sign in with google</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}