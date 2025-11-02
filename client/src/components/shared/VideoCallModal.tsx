import { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Phone, Video as VideoIcon, VideoOff } from 'lucide-react';
import videoCallService, { type VideoCallState } from '../../services/videoCallService';
import { Avatar } from './Avatar';

export const VideoCallModal = () => {
  const [callState, setCallState] = useState<VideoCallState>(videoCallService.getCallState());
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    videoCallService.ensureSocketListeners();

    const unsubscribe = videoCallService.subscribe((state) => {
      setCallState(state);

      if (!state.isInCall && !state.isCalling && !state.isReceivingCall) {
        setIsMinimized(false);
      }

      if (remoteVideoRef.current) {
        if (state.remoteStream && remoteVideoRef.current.srcObject !== state.remoteStream) {
          remoteVideoRef.current.srcObject = state.remoteStream;
        }
        if (!state.remoteStream && remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject = null;
        }
      }

      if (localVideoRef.current) {
        if (state.localStream && localVideoRef.current.srcObject !== state.localStream) {
          localVideoRef.current.srcObject = state.localStream;
        }
        if (!state.localStream && localVideoRef.current.srcObject) {
          localVideoRef.current.srcObject = null;
        }
      }

      if (state.isInCall && !callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }

      if (!state.isInCall && !state.isCalling && !state.isReceivingCall) {
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        setCallDuration(0);
        setIsMuted(false);
        setIsCameraOff(false);
      }
    });

    return () => {
      unsubscribe();
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  const handleAnswer = () => {
    videoCallService.answerCall();
  };

  const handleReject = () => {
    videoCallService.rejectCall();
  };

  const handleEnd = () => {
    void videoCallService.endCall();
  };

  const handleToggleMute = () => {
    const muted = videoCallService.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCamera = () => {
    const cameraOff = videoCallService.toggleCamera();
    setIsCameraOff(cameraOff);
  };

  const handleClose = () => {
    setIsMinimized(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!callState.isInCall && !callState.isCalling && !callState.isReceivingCall) {
    return null;
  }

  const displayUser = (() => {
    if (callState.participant) {
      return callState.participant;
    }

    if (callState.caller) {
      return {
        id: callState.caller.callerId,
        name: callState.caller.callerName,
        avatar: callState.caller.callerAvatar,
      };
    }

    return {
      id: 'unknown',
      name: 'Unknown',
      avatar: null,
    };
  })();

  const statusLabel = (() => {
    if (callState.isInCall) {
      return `Đang gọi • ${formatDuration(callDuration)}`;
    }
    if (callState.isCalling) {
      return 'Đang kết nối...';
    }
    return 'Cuộc gọi đến';
  })();

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 cursor-pointer"
      >
        <div className="bg-black/80 text-white rounded-2xl px-4 py-3 shadow-2xl border border-orange-500/60 min-w-[200px]">
          <div className="flex items-center gap-3">
            <Avatar src={displayUser.avatar} name={displayUser.name} className="w-10 h-10" size="md" />
            <div>
              <div className="text-sm font-semibold">{displayUser.name}</div>
              <div className="text-xs text-white/80">{statusLabel}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showLocalPreview = Boolean(callState.localStream);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur flex items-center justify-center z-50">
      <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-orange-500/50">
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover bg-gray-900"
          autoPlay
          playsInline
        />

        {!callState.remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 gap-4">
            <Avatar src={displayUser.avatar} name={displayUser.name} className="w-28 h-28" size="xl" />
            <div className="text-lg font-medium">Đang chờ kết nối video...</div>
          </div>
        )}

  <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/20 to-black/60 pointer-events-none" />

        <div className="absolute top-6 left-6 flex items-center gap-4 text-white">
          <Avatar src={displayUser.avatar} name={displayUser.name} className="w-16 h-16" size="xl" />
          <div>
            <div className="text-2xl font-semibold">{displayUser.name}</div>
            <div className="text-sm text-white/80">{statusLabel}</div>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
          title="Thu nhỏ"
        >
          <X className="w-5 h-5" />
        </button>

        {showLocalPreview && (
          <div className="absolute bottom-6 right-6 w-48 h-32 bg-black/60 rounded-2xl overflow-hidden border-2 border-orange-400 shadow-xl">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {isCameraOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                <VideoOff className="w-8 h-8 mb-2" />
                <span className="text-xs">Đã tắt camera</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {callState.isReceivingCall ? (
            <>
              <button
                onClick={handleReject}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 cursor-pointer"
                title="Từ chối"
              >
                <Phone className="w-6 h-6 -rotate-135" />
              </button>
              <button
                onClick={handleAnswer}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 cursor-pointer"
                title="Trả lời"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleToggleCamera}
                className={`${
                  isCameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
                } text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 cursor-pointer`}
                title={isCameraOff ? 'Bật camera' : 'Tắt camera'}
              >
                {isCameraOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
              </button>
              <button
                onClick={handleToggleMute}
                className={`${
                  isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
                } text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 cursor-pointer`}
                title={isMuted ? 'Bật mic' : 'Tắt mic'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={handleEnd}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 cursor-pointer"
                title="Kết thúc"
              >
                <Phone className="w-6 h-6 -rotate-135" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
