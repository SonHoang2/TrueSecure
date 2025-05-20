import { Receiver } from "../../types/users.types";

export interface OutgoingCallModalProps {
    onEndCall: () => void;
    receiver: Receiver;
    isVideoCall: boolean;
    localStream?: MediaStream | null;
}