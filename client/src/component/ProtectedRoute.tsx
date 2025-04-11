import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../config/config";

export const ProtectedRoute = ({ allowedRole }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to={ROUTES.LOGIN} />;

    if (allowedRole && allowedRole !== user.role) {
        return <Navigate to="/" />;
    }

    return <Outlet />;
};
export default ProtectedRoute;