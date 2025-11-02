import { useEffect, useState, useRef } from 'react';
import { X, Mic, MicOff, Phone } from 'lucide-react';
import voiceCallService, { type CallState } from '../../services/voiceCallService';
import { Avatar } from './Avatar';

export const VoiceCallModal = () => {
  const [callState, setCallState] = useState<CallState>(voiceCallService.getCallState());
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  console.log('VoiceCallModal: Rendering with state', callState);

  useEffect(() => {
    console.log('VoiceCallModal: Subscribing to voice call service');
    // Ensure socket listeners are set up
    voiceCallService.ensureSocketListeners();
    
    const unsubscribe = voiceCallService.subscribe((state) => {
      console.log('VoiceCallModal: Received state update', state);
      setCallState(state);
      
      // Reset minimize when call ends
      if (!state.isInCall && !state.isCalling && !state.isReceivingCall) {
        setIsMinimized(false);
      }
      
      // Setup remote audio when stream is available
      if (state.remoteStream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = state.remoteStream;
      }

      // Start timer when call is connected
      if (state.isInCall && !callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }

      // Clean up timer when call ends
      if (!state.isInCall && !state.isCalling && !state.isReceivingCall) {
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
        setCallDuration(0);
        setIsMuted(false);
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
    voiceCallService.answerCall();
  };

  const handleReject = () => {
    voiceCallService.rejectCall();
  };

  const handleEnd = () => {
    voiceCallService.endCall();
  };

  const handleClose = () => {
    // Just minimize the modal, don't end the call
    setIsMinimized(true);
  };

  const handleToggleMute = () => {
    const muted = voiceCallService.toggleMute();
    setIsMuted(muted);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no call activity
  if (!callState.isInCall && !callState.isCalling && !callState.isReceivingCall) {
    return null;
  }

  // Display logic:
  // - If receiving call: show caller info (who is calling me)
  // - If making call: show receiver info (who I'm calling)
  const displayUser = callState.caller ? {
    name: callState.caller.callerName,
    avatar: callState.caller.callerAvatar,
  } : {
    name: 'Unknown',
    avatar: null,
  };

  // If minimized, show floating indicator
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-orange-500 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-3 cursor-pointer hover:bg-orange-600 transition-all z-[9999] animate-pulse"
      >
        <Phone className="w-5 h-5" />
        <div>
          <div className="text-sm font-semibold">
            {callState.isInCall && `Đang gọi - ${formatDuration(callDuration)}`}
            {callState.isCalling && 'Đang gọi...'}
            {callState.isReceivingCall && 'Cuộc gọi đến'}
          </div>
          <div className="text-xs opacity-90">{displayUser.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-2xl w-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-semibold">
            {callState.isReceivingCall && 'Cuộc gọi đến'}
            {callState.isCalling && 'Đang gọi...'}
            {callState.isInCall && 'Đang gọi'}
          </h3>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Avatar */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Avatar
                src={displayUser.avatar}
                name={displayUser.name}
                size="xl"
                className="w-32 h-32"
              />
              {callState.isInCall && (
                <div className="absolute inset-0 rounded-full border-4 border-orange-500 animate-pulse" />
              )}
            </div>
          </div>

          {/* User name */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {displayUser.name}
          </h2>

          {/* Status */}
          <p className="text-gray-600 mb-6">
            {callState.isReceivingCall && 'Đang gọi cho bạn...'}
            {callState.isCalling && 'Đang kết nối...'}
            {callState.isInCall && formatDuration(callDuration)}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {callState.isReceivingCall && (
              <>
                <button
                  onClick={handleReject}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 cursor-pointer"
                >
                  <Phone className="w-6 h-6 -rotate-[135deg]" />
                </button>
                <button
                  onClick={handleAnswer}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 cursor-pointer"
                >
                  <Phone className="w-6 h-6" />
                </button>
              </>
            )}

            {(callState.isCalling || callState.isInCall) && (
              <>
                {callState.isInCall && (
                  <button
                    onClick={handleToggleMute}
                    className={`${
                      isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'
                    } text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 cursor-pointer`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                )}
                <button
                  onClick={handleEnd}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 cursor-pointer"
                >
                  <Phone className="w-6 h-6 -rotate-[135deg]" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Remote audio element */}
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
};
