import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ProtectedRoute = ({ allowedRole }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/auth/login" />;

    if (allowedRole && allowedRole !== user.role) {
        return <Navigate to="/" />;
    }

    return <Outlet />;
};
export default ProtectedRoute;