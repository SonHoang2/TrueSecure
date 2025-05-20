import { Role } from "../../enums/role.enum";

export interface ProtectedRouteProps {
    allowedRole: Role;
}