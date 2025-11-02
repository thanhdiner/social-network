import SimplePeer from 'simple-peer';
import socketService from './socketService';
import { chatService } from './chatService';
import type { VoiceCallData, CallState } from './voiceCallService';

export type VideoCallState = CallState;

class VideoCallService {
  private peer: SimplePeer.Instance | null = null;
  private callState: VideoCallState = {
    isInCall: false,
    isCalling: false,
    isReceivingCall: false,
    caller: null,
    participant: null,
    localStream: null,
    remoteStream: null,
  };
  private listeners: Array<(state: VideoCallState) => void> = [];
  private audioContext: AudioContext | null = null;
  private ringtoneGain: GainNode | null = null;
  private ringtoneIntervalId: NodeJS.Timeout | null = null;
  private listenersSetup = false;
  private currentUserId: string | null = null;
  private currentUserInfo: { id: string; name: string; avatar: string | null } | null = null;
  private activePeerUserId: string | null = null;
  private callStartTimestamp: number | null = null;
  private isInitiator = false;
  private callLogged = false;
  private callTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.setupRingtone();
  }

  setCurrentUser(user: { id: string; name: string; avatar: string | null } | null) {
    this.currentUserInfo = user;
    this.currentUserId = user?.id ?? null;
  }

  private setupRingtone() {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  private playRingtone() {
    if (!this.audioContext) return;

    try {
      this.stopRingtone();

      this.ringtoneGain = this.audioContext.createGain();
      this.ringtoneGain.connect(this.audioContext.destination);
      this.ringtoneGain.gain.value = 0.2;

      const playTone = () => {
        if (!this.audioContext || !this.ringtoneGain) return;

        const frequencies = [659, 784, 659, 523];
        const durations = [0.15, 0.15, 0.3, 0.4];
        let currentTime = this.audioContext.currentTime;

        frequencies.forEach((freq, index) => {
          const osc = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();

          osc.type = 'sine';
          osc.frequency.value = freq;

          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.02);
          gainNode.gain.linearRampToValueAtTime(0.2, currentTime + durations[index] * 0.5);
          gainNode.gain.linearRampToValueAtTime(0, currentTime + durations[index]);

          osc.connect(gainNode);
          gainNode.connect(this.ringtoneGain!);

          osc.start(currentTime);
          osc.stop(currentTime + durations[index]);

          currentTime += durations[index] + 0.05;
        });
      };

      playTone();
      this.ringtoneIntervalId = setInterval(playTone, 3000);
    } catch (e) {
      console.error('Error playing ringtone', e);
    }
  }

  private stopRingtone() {
    if (this.ringtoneIntervalId) {
      clearInterval(this.ringtoneIntervalId);
      this.ringtoneIntervalId = null;
    }

    if (this.ringtoneGain) {
      try {
        this.ringtoneGain.disconnect();
      } catch {
        /* gain already disconnected */
      }
      this.ringtoneGain = null;
    }
  }

  private clearCallTimeout() {
    if (this.callTimeoutId) {
      clearTimeout(this.callTimeoutId);
      this.callTimeoutId = null;
    }
  }

  private scheduleCallTimeout() {
    this.clearCallTimeout();
    this.callTimeoutId = setTimeout(() => {
      if (this.isInitiator && this.callState.isCalling && !this.callState.isInCall) {
        console.log('VideoCallService: Call timeout reached, ending call');
        this.stopRingtone();
        void this.endCall();
      }
    }, 15000);
  }

  ensureSocketListeners() {
    if (this.listenersSetup) {
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      console.warn('VideoCallService: No socket available for video call');
      return;
    }

    console.log('VideoCallService: Setting up socket listeners');
    this.listenersSetup = true;

    socket.on('video_call_incoming', (data: VoiceCallData) => {
      console.log('VideoCallService: Received video_call_incoming', data);
      this.isInitiator = false;
      this.callLogged = false;
      this.callStartTimestamp = null;
      this.activePeerUserId = data.callerId;
      this.callState.isReceivingCall = true;
      this.callState.caller = data;
      this.callState.participant = {
        id: data.callerId,
        name: data.callerName,
        avatar: data.callerAvatar,
      };
      this.playRingtone();
      this.notifyListeners();
    });

    socket.on('video_call_accepted', async () => {
      console.log('VideoCallService: Call accepted');
      this.stopRingtone();
      this.callState.isCalling = false;
      this.callState.isInCall = true;
      this.callStartTimestamp = Date.now();
      this.clearCallTimeout();
      this.notifyListeners();
    });

    socket.on('video_call_rejected', () => {
      console.log('VideoCallService: Call rejected');
      this.stopRingtone();
      this.clearCallTimeout();
      if (this.isInitiator) {
        void this.logCall('rejected', 0);
      }
      void this.endCall({ skipLog: true });
    });

    socket.on('video_call_ended', () => {
      console.log('VideoCallService: Call ended');
      this.clearCallTimeout();
      void this.endCall();
    });

    socket.on('video_call_signal', (data: { signal: SimplePeer.SignalData }) => {
      console.log('VideoCallService: Received signal');
      if (this.peer) {
        this.peer.signal(data.signal);
      }
    });
  }

  subscribe(listener: (state: VideoCallState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener({ ...this.callState }));
  }

  async startCall(userId: string, userName: string, userAvatar: string | null) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      this.currentUserId = this.currentUserInfo?.id ?? null;
      this.activePeerUserId = userId;
      this.isInitiator = true;
      this.callStartTimestamp = null;
      this.callLogged = false;
      this.callState.localStream = stream;
      this.callState.isCalling = true;
      this.callState.caller = {
        callerId: userId,
        receiverId: this.currentUserInfo?.id ?? '',
        callerName: userName,
        callerAvatar: userAvatar,
      };
      this.callState.participant = {
        id: userId,
        name: userName,
        avatar: userAvatar,
      };

      this.notifyListeners();

      this.peer = new SimplePeer({
        initiator: true,
        stream,
        trickle: false,
      });

      this.setupPeerListeners();

      const socket = socketService.getSocket();
      socket?.emit('video_call_start', {
        receiverId: userId,
        callerName: this.currentUserInfo?.name ?? 'Someone',
        callerAvatar: this.currentUserInfo?.avatar ?? null,
      });

      this.playRingtone();
      this.scheduleCallTimeout();
    } catch (error) {
      console.error('Error starting video call:', error);
      await this.endCall({ skipLog: true });
      throw error;
    }
  }

  async answerCall() {
    if (!this.callState.caller) return;

    try {
      this.stopRingtone();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      this.callState.localStream = stream;
      this.callState.isReceivingCall = false;
      this.callState.isInCall = true;
      this.callStartTimestamp = Date.now();
      this.activePeerUserId = this.callState.caller.callerId;
      this.callState.participant = {
        id: this.callState.caller.callerId,
        name: this.callState.caller.callerName,
        avatar: this.callState.caller.callerAvatar,
      };
      this.notifyListeners();

      this.peer = new SimplePeer({
        initiator: false,
        stream,
        trickle: false,
      });

      this.setupPeerListeners();

      const socket = socketService.getSocket();
      socket?.emit('video_call_accept', {
        callerId: this.callState.caller.callerId,
      });
    } catch (error) {
      console.error('Error answering video call:', error);
      this.rejectCall();
      throw error;
    }
  }

  rejectCall() {
    console.log('VideoCallService: Rejecting call');

    if (!this.callState.caller) {
      console.warn('VideoCallService: No caller info to reject');
      void this.endCall({ skipLog: true });
      return;
    }

    const socket = socketService.getSocket();
    socket?.emit('video_call_reject', {
      callerId: this.callState.caller.callerId,
    });

    this.stopRingtone();
    void this.endCall({ skipLog: true });
  }

  async endCall(options?: { skipLog?: boolean }) {
    console.log('VideoCallService: Ending call');

    const skipLog = options?.skipLog ?? false;
    const wasInCall = this.callState.isInCall;
    const wasCalling = this.callState.isCalling;
    const callStartedAt = this.callStartTimestamp;

    if (!skipLog && this.isInitiator && !this.callLogged) {
      if (wasInCall && callStartedAt) {
        const durationSeconds = Math.max(1, Math.floor((Date.now() - callStartedAt) / 1000));
        void this.logCall('completed', durationSeconds);
      } else if (wasCalling && !wasInCall) {
        void this.logCall('no-answer', 0);
      }
    }
    this.clearCallTimeout();

    if (this.callState.isInCall || this.callState.isCalling) {
      const socket = socketService.getSocket();
      const targetId = this.callState.caller?.callerId || this.callState.caller?.receiverId;
      if (targetId) {
        socket?.emit('video_call_end', { userId: targetId });
      }
    }

    this.stopRingtone();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        console.error('Error destroying peer:', e);
      }
      this.peer = null;
    }

    if (this.callState.localStream) {
      this.callState.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
    }

    this.callState = {
      isInCall: false,
      isCalling: false,
      isReceivingCall: false,
      caller: null,
      participant: null,
      localStream: null,
      remoteStream: null,
    };

    this.activePeerUserId = null;
    this.callStartTimestamp = null;
    this.isInitiator = false;
    this.callLogged = false;

    console.log('VideoCallService: Call ended, state reset');
    this.notifyListeners();
  }

  private setupPeerListeners() {
    if (!this.peer) return;

    this.peer.on('signal', (signal: SimplePeer.SignalData) => {
      const socket = socketService.getSocket();
      const targetId = this.callState.caller?.callerId || this.callState.caller?.receiverId;

      socket?.emit('video_call_signal', {
        userId: targetId,
        signal,
      });
    });

    this.peer.on('stream', (stream: MediaStream) => {
      this.callState.remoteStream = stream;
      this.notifyListeners();
    });

    this.peer.on('error', (error: Error) => {
      console.error('Video peer error:', error);
      void this.endCall({ skipLog: !this.isInitiator });
    });

    this.peer.on('close', () => {
      void this.endCall();
    });
  }

  getCallState() {
    return { ...this.callState };
  }

  toggleMute() {
    if (this.callState.localStream) {
      const audioTrack = this.callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleCamera() {
    if (this.callState.localStream) {
      const videoTrack = this.callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  private async logCall(
    callStatus: 'completed' | 'missed' | 'rejected' | 'no-answer',
    callDuration: number,
  ) {
    if (!this.isInitiator) {
      console.log('VideoCallService: Skipping call log for non-initiator');
      return;
    }

    if (this.callLogged) {
      console.log('VideoCallService: Call already logged');
      return;
    }

    if (!this.activePeerUserId) {
      console.warn('VideoCallService: Unable to log call - missing peer user id');
      return;
    }

    if (!this.currentUserId) {
      console.warn('VideoCallService: Unable to log call - missing current user id');
      return;
    }

    this.callLogged = true;
    const receiverId = this.activePeerUserId;

    try {
      await chatService.logCall(receiverId, 'video', callDuration, callStatus);
      console.log('VideoCallService: Call log saved', { receiverId, callStatus, callDuration });
    } catch (error) {
      console.error('VideoCallService: Failed to log call', error);
    }
  }
}

export default new VideoCallService();
