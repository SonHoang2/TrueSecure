import { useEffect, useRef } from 'react';

const InCallModal = ({ localStream, remoteStream, callState, onEnd }) => {
    const localRef = useRef();
    const remoteRef = useRef();

    console.log("localStream", localStream);
    console.log("remoteStream", remoteStream);

    useEffect(() => {
        if (localRef.current) {
            localRef.current.srcObject = localStream;
            localRef.current.muted = true;
        }
        if (remoteRef.current) {
            remoteRef.current.srcObject = remoteStream;
        }
    }, [localStream, remoteStream]);

    return (
        <div className="call-container">
            {/* {callState.isVideoCall ? (
                <>
                    <video ref={remoteRef} autoPlay className="remote-video" />
                    <video ref={localRef} autoPlay muted className="local-video" />
                </>
            ) : ( */}
                <>
                    <audio ref={remoteRef} autoPlay />
                    <audio ref={localRef} autoPlay muted />
                    <div className="audio-ui">
                        <h2>Audio Call with User</h2>
                    </div>
                </>
            {/* )} */}
            <button onClick={onEnd}>End Call</button>
        </div>
    );
};


export default InCallModal;