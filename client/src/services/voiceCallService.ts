import SimplePeer from 'simple-peer';
import socketService from './socketService';

export interface VoiceCallData {
  callerId: string;
  receiverId: string;
  callerName: string;
  callerAvatar: string | null;
}

export interface CallState {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  caller: VoiceCallData | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

class VoiceCallService {
  private peer: SimplePeer.Instance | null = null;
  private callState: CallState = {
    isInCall: false,
    isCalling: false,
    isReceivingCall: false,
    caller: null,
    localStream: null,
    remoteStream: null,
  };
  private listeners: Array<(state: CallState) => void> = [];
  private audioContext: AudioContext | null = null;
  private ringtoneGain: GainNode | null = null;
  private ringtoneIntervalId: NodeJS.Timeout | null = null;
  private listenersSetup = false;

  constructor() {
    this.setupRingtone();
  }

  private setupRingtone() {
    // Create audio context for generating ringtone
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  private playRingtone() {
    if (!this.audioContext) return;

    try {
      // Stop any existing ringtone
      this.stopRingtone();

      // Create gain node for volume control
      this.ringtoneGain = this.audioContext.createGain();
      this.ringtoneGain.connect(this.audioContext.destination);
      this.ringtoneGain.gain.value = 0.2; // 20% volume

      // iPhone-style ringtone pattern (Marimba-like)
      const playTone = () => {
        if (!this.audioContext || !this.ringtoneGain) return;

        const frequencies = [659, 784, 659, 523]; // E5, G5, E5, C5
        const durations = [0.15, 0.15, 0.3, 0.4];
        let currentTime = this.audioContext.currentTime;

        frequencies.forEach((freq, index) => {
          const osc = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();
          
          osc.type = 'sine'; // Sine wave for smooth tone
          osc.frequency.value = freq;
          
          // ADSR envelope for more natural sound
          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.02); // Attack
          gainNode.gain.linearRampToValueAtTime(0.2, currentTime + durations[index] * 0.5); // Decay
          gainNode.gain.linearRampToValueAtTime(0, currentTime + durations[index]); // Release
          
          osc.connect(gainNode);
          gainNode.connect(this.ringtoneGain!);
          
          osc.start(currentTime);
          osc.stop(currentTime + durations[index]);
          
          currentTime += durations[index] + 0.05; // Small gap between notes
        });
      };

      // Play pattern every 3 seconds
      playTone();
      this.ringtoneIntervalId = setInterval(playTone, 3000);

    } catch (e) {
      console.error('Error playing ringtone', e);
    }
  }

  private stopRingtone() {
    // Clear interval
    if (this.ringtoneIntervalId) {
      clearInterval(this.ringtoneIntervalId);
      this.ringtoneIntervalId = null;
    }

    // Stop gain node
    if (this.ringtoneGain) {
      try {
        this.ringtoneGain.disconnect();
      } catch {
        // Already disconnected
      }
      this.ringtoneGain = null;
    }
  }

  // Setup socket listeners when needed
  ensureSocketListeners() {
    if (this.listenersSetup) {
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      console.warn('VoiceCallService: No socket available for voice call');
      return;
    }

    console.log('VoiceCallService: Setting up socket listeners');
    this.listenersSetup = true;

    socket.on('voice_call_incoming', (data: VoiceCallData) => {
      console.log('VoiceCallService: Received voice_call_incoming', data);
      this.callState.isReceivingCall = true;
      this.callState.caller = data;
      this.playRingtone();
      this.notifyListeners();
    });

    socket.on('voice_call_accepted', async () => {
      console.log('VoiceCallService: Call accepted');
      this.stopRingtone();
      this.callState.isCalling = false;
      this.callState.isInCall = true;
      this.notifyListeners();
    });

    socket.on('voice_call_rejected', () => {
      console.log('VoiceCallService: Call rejected');
      this.stopRingtone();
      this.endCall();
    });

    socket.on('voice_call_ended', () => {
      console.log('VoiceCallService: Call ended');
      this.endCall();
    });

    socket.on('voice_call_signal', (data: { signal: SimplePeer.SignalData }) => {
      console.log('VoiceCallService: Received signal');
      if (this.peer) {
        this.peer.signal(data.signal);
      }
    });
  }

  subscribe(listener: (state: CallState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    console.log('VoiceCallService: notifyListeners', this.listeners.length, this.callState);
    this.listeners.forEach(listener => listener({ ...this.callState }));
  }

  async startCall(userId: string, userName: string, userAvatar: string | null) {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });

      this.callState.localStream = stream;
      this.callState.isCalling = true;
      // Store receiver info for the caller
      this.callState.caller = {
        callerId: '', // Will be set by currentUser
        receiverId: userId,
        callerName: userName, // This is the person we're calling
        callerAvatar: userAvatar,
      };
      
      this.notifyListeners();

      // Create peer as initiator
      this.peer = new SimplePeer({
        initiator: true,
        stream: stream,
        trickle: false,
      });

      this.setupPeerListeners();

      // Emit call request
      const socket = socketService.getSocket();
      socket?.emit('voice_call_start', {
        receiverId: userId,
        callerName: userName,
        callerAvatar: userAvatar,
      });

      this.playRingtone();
    } catch (error) {
      console.error('Error starting call:', error);
      this.endCall();
      throw error;
    }
  }

  async answerCall() {
    if (!this.callState.caller) return;

    try {
      this.stopRingtone();

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });

      this.callState.localStream = stream;
      this.callState.isReceivingCall = false;
      this.callState.isInCall = true;
      this.notifyListeners();

      // Create peer as receiver
      this.peer = new SimplePeer({
        initiator: false,
        stream: stream,
        trickle: false,
      });

      this.setupPeerListeners();

      // Emit acceptance
      const socket = socketService.getSocket();
      socket?.emit('voice_call_accept', {
        callerId: this.callState.caller.callerId,
      });
    } catch (error) {
      console.error('Error answering call:', error);
      this.rejectCall();
      throw error;
    }
  }

  rejectCall() {
    console.log('VoiceCallService: Rejecting call');
    
    if (!this.callState.caller) {
      console.warn('VoiceCallService: No caller info to reject');
      this.endCall();
      return;
    }

    const socket = socketService.getSocket();
    socket?.emit('voice_call_reject', {
      callerId: this.callState.caller.callerId,
    });

    // Stop ringtone immediately
    this.stopRingtone();
    
    // Clean up everything
    this.endCall();
  }

  endCall() {
    console.log('VoiceCallService: Ending call');
    
    // Notify other peer (only if in active call or calling)
    if (this.callState.isInCall || this.callState.isCalling) {
      const socket = socketService.getSocket();
      const targetId = this.callState.caller?.callerId || this.callState.caller?.receiverId;
      if (targetId) {
        socket?.emit('voice_call_end', { userId: targetId });
      }
    }

    // Stop ringtone - always do this
    this.stopRingtone();

    // Clean up peer
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        console.error('Error destroying peer:', e);
      }
      this.peer = null;
    }

    // Stop local stream
    if (this.callState.localStream) {
      this.callState.localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
    }

    // Reset state completely
    this.callState = {
      isInCall: false,
      isCalling: false,
      isReceivingCall: false,
      caller: null,
      localStream: null,
      remoteStream: null,
    };

    console.log('VoiceCallService: Call ended, state reset');
    this.notifyListeners();
  }

  private setupPeerListeners() {
    if (!this.peer) return;

    this.peer.on('signal', (signal: SimplePeer.SignalData) => {
      const socket = socketService.getSocket();
      const targetId = this.callState.caller?.callerId || this.callState.caller?.receiverId;
      
      socket?.emit('voice_call_signal', {
        userId: targetId,
        signal: signal,
      });
    });

    this.peer.on('stream', (stream: MediaStream) => {
      this.callState.remoteStream = stream;
      this.notifyListeners();
    });

    this.peer.on('error', (error: Error) => {
      console.error('Peer error:', error);
      this.endCall();
    });

    this.peer.on('close', () => {
      this.endCall();
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
        return !audioTrack.enabled; // Return muted state
      }
    }
    return false;
  }
}

export default new VoiceCallService();
