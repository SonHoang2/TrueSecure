import { AppRole } from '../../enums/roles.enum';

export interface ProtectedRouteProps {
    allowedRole: AppRole;
}
