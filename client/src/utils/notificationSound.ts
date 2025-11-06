// Utility để phát âm thanh thông báo tin nhắn
class NotificationSound {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // Khởi tạo AudioContext khi cần
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  // Tạo và phát âm thanh thông báo bằng Web Audio API
  private playBeep() {
    if (!this.audioContext) return;

    // Tạo oscillator (tạo sóng âm thanh)
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Kết nối oscillator -> gain -> destination (speaker)
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Cấu hình âm thanh (giống Facebook Messenger)
    oscillator.type = 'sine'; // Sóng sine cho âm thanh mượt mà
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime); // Tần số 800Hz
    
    // Fade in/out để tránh âm thanh chói tai
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    // Phát âm thanh
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  // Phát âm thanh thông báo
  play() {
    if (!this.isEnabled) return;

    console.log('🔊 [NotificationSound] Playing notification sound...');

    try {
      // Resume AudioContext nếu bị suspend (do chính sách trình duyệt)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('🔊 [NotificationSound] Resuming suspended AudioContext');
        this.audioContext.resume();
      }
      
      console.log('🔊 [NotificationSound] AudioContext state:', this.audioContext?.state);
      this.playBeep();
    } catch (err) {
      console.warn('Could not play notification sound:', err);
    }
  }

  // Play a custom tone
  private playTone(frequency: number, duration = 0.25, volume = 0.25) {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      if (this.audioContext.state === 'suspended') this.audioContext.resume();

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + duration);
    } catch (err) {
      console.warn('Could not play tone:', err);
    }
  }

  // Positive feedback (e.g., like)
  playPositive() {
    this.playTone(1000, 0.18, 0.28);
  }

  // Negative feedback (e.g., unlike)
  playNegative() {
    // lower pitch and shorter
    this.playTone(600, 0.14, 0.18);
  }

  // Bật/tắt âm thanh
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Kiểm tra trạng thái
  isNotificationEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const notificationSound = new NotificationSound();
