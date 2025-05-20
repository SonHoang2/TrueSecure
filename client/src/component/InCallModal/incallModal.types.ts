import { Receiver } from "../../types/users.types";

export type InCallModalProps = {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onEndCall: () => void;
    isVideoCall: boolean;
    receiver: Receiver | null;
};
