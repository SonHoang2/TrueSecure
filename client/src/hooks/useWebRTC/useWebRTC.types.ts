import { User } from '../../types/users.types';
import { Socket } from 'socket.io-client';

export interface UseWebRTCProps {
    receiverId: number;
    socket: Socket;
    user: User;
}

export interface CallState {
    isCalling: boolean;
    isRinging: boolean;
    isConnected: boolean;
    isVideoCall: boolean;
    sender: User | null;
    offer: RTCSessionDescriptionInit | null;
}

export interface UseWebRTCResult {
    callState: CallState;
    startCall: (isVideo?: boolean) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: (shouldNotifyPeer?: boolean) => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}
