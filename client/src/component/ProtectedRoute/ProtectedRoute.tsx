import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth/useAuth';
import { Routes } from '../../enums/routes.enum';
import { ProtectedRouteProps } from './ProtectedRoute.types';

export const ProtectedRoute = ({ allowedRole }: ProtectedRouteProps) => {
    const auth = useAuth();
    if (!auth || !auth.user) return <Navigate to={Routes.LOGIN} />;

    if (allowedRole && allowedRole !== auth.user.role) {
        return <Navigate to="/" />;
    }

    return <Outlet />;
};
export default ProtectedRoute;
