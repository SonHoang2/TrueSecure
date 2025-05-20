import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Routes } from '../../enums/routes.enum';

export const ProtectedRoute = ({ allowedRole }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to={Routes.LOGIN} />;

    if (allowedRole && allowedRole !== user.role) {
        return <Navigate to="/" />;
    }

    return <Outlet />;
};
export default ProtectedRoute;
