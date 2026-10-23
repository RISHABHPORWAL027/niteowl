// NiteOwl Real-time Cross-Tab & Cross-Device Event Synchronization & Audio Alerts

import { Order, OrderStatus } from '@/types/database';

export type RealtimeMessage =
  | { type: 'ORDER_PLACED'; order: Order }
  | { type: 'ORDER_STATUS_UPDATED'; orderId: string; status: OrderStatus; riderName?: string; estimatedMins?: number }
  | { type: 'DRIVER_LOCATION_UPDATED'; orderId: string; progress: number; lat: number; lng: number; estimatedMins: number };

const CHANNEL_NAME = 'niteowl_hub_realtime_channel';

class RealtimeHub {
  private channel: BroadcastChannel | null = null;
  private listeners: ((msg: RealtimeMessage) => void)[] = [];
  private audioContext: AudioContext | null = null;
  private isAudioUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data) {
            this.notifyListeners(event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported, using storage event fallback');
      }

      // Storage event fallback for older environments
      window.addEventListener('storage', (e) => {
        if (e.key === 'niteowl_realtime_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch (err) {
            // ignore
          }
        }
      });

      // Unlock AudioContext on first user gesture
      const unlockAudio = () => {
        this.ensureAudioContext();
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            this.isAudioUnlocked = true;
          });
        } else {
          this.isAudioUnlocked = true;
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    return this.audioContext;
  }

  public subscribe(callback: (msg: RealtimeMessage) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public broadcast(msg: RealtimeMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        // ignore
      }
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'niteowl_realtime_event',
          JSON.stringify({ ...msg, _t: Date.now() })
        );
      } catch (e) {
        // ignore
      }
    }
    // Also notify local listeners in the current tab
    this.notifyListeners(msg);
  }

  private notifyListeners(msg: RealtimeMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(msg);
      } catch (e) {
        console.error('Error in realtime listener:', e);
      }
    });
  }

  /**
   * Synthesize a crisp 2-tone kitchen order chime (Ding-Dong!)
   * No external assets required; 100% reliable in all browsers.
   */
  public playKitchenChime() {
    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: High chime (587.33 Hz - D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: Harmonious resolving chime (880 Hz - A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.16);
      gain2.gain.setValueAtTime(0.5, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Could not play kitchen chime:', e);
    }
  }
}

export const realtimeHub = new RealtimeHub();

// ==============================================================================
// Indore Bhawarkua Hyper-Local GPS Street Coordinates
// ==============================================================================

export const BHAWARKUA_HUB_COORDS = {
  lat: 22.6926,
  lng: 75.8676,
  name: 'Bhawarkua Central Hub (Kitchen)',
};

// Common customer delivery destinations in Bhawarkua Indore
export const INDORE_LANDMARK_COORDS: Record<string, { lat: number; lng: number; waypoints: [number, number][] }> = {
  'Bholaram Ustad Marg': {
    lat: 22.6955,
    lng: 75.8635,
    waypoints: [
      [22.6926, 75.8676], // Hub
      [22.6931, 75.8665], // Bhawarkua Crossing
      [22.6938, 75.8652], // Bholaram Entrance
      [22.6946, 75.8643], // Main Market
      [22.6955, 75.8635], // Customer Drop Point
    ],
  },
  'Maa Gayatri Girls PG': {
    lat: 22.6942,
    lng: 75.8628,
    waypoints: [
      [22.6926, 75.8676],
      [22.6931, 75.8665],
      [22.6938, 75.8648],
      [22.6942, 75.8628],
    ],
  },
  'Tower Square Crossing': {
    lat: 22.6975,
    lng: 75.8710,
    waypoints: [
      [22.6926, 75.8676],
      [22.6942, 75.8688],
      [22.6960, 75.8701],
      [22.6975, 75.8710],
    ],
  },
  'Vishnu Puri NX': {
    lat: 22.6882,
    lng: 75.8638,
    waypoints: [
      [22.6926, 75.8676],
      [22.6912, 75.8662],
      [22.6898, 75.8649],
      [22.6882, 75.8638],
    ],
  },
  'Rajiv Gandhi Square': {
    lat: 22.6845,
    lng: 75.8592,
    waypoints: [
      [22.6926, 75.8676],
      [22.6908, 75.8655],
      [22.6878, 75.8625],
      [22.6860, 75.8605],
      [22.6845, 75.8592],
    ],
  },
};

/**
 * Get route waypoints from Hub to landmark, or fallback to an interpolated path
 */
export function getRouteForLandmark(landmarkName?: string): {
  destination: { lat: number; lng: number };
  waypoints: [number, number][];
} {
  const match = Object.keys(INDORE_LANDMARK_COORDS).find((name) =>
    landmarkName?.toLowerCase().includes(name.toLowerCase())
  );

  if (match) {
    const route = INDORE_LANDMARK_COORDS[match];
    return {
      destination: { lat: route.lat, lng: route.lng },
      waypoints: route.waypoints,
    };
  }

  // Fallback default: Bholaram Ustad Marg
  const fallback = INDORE_LANDMARK_COORDS['Bholaram Ustad Marg'];
  return {
    destination: { lat: fallback.lat, lng: fallback.lng },
    waypoints: fallback.waypoints,
  };
}

/**
 * Given a set of waypoints and a progress (0.0 to 1.0), calculate current position
 */
export function interpolatePosition(
  waypoints: [number, number][],
  progress: number
): { lat: number; lng: number } {
  if (waypoints.length === 0) {
    return BHAWARKUA_HUB_COORDS;
  }
  if (waypoints.length === 1 || progress <= 0) {
    return { lat: waypoints[0][0], lng: waypoints[0][1] };
  }
  if (progress >= 1) {
    const last = waypoints[waypoints.length - 1];
    return { lat: last[0], lng: last[1] };
  }

  const totalSegments = waypoints.length - 1;
  const scaledProgress = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
  const segmentProgress = scaledProgress - segmentIndex;

  const start = waypoints[segmentIndex];
  const end = waypoints[segmentIndex + 1];

  const lat = start[0] + (end[0] - start[0]) * segmentProgress;
  const lng = start[1] + (end[1] - start[1]) * segmentProgress;

  return { lat, lng };
}
