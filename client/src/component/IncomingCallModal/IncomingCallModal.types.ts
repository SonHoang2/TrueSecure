import { User } from "../../types/users.types";

export interface IncomingCallModalProps {
    onReject: () => void;
    onAccept: () => void;
    sender: User;
}