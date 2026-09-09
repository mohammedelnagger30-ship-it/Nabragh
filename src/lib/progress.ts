/* eslint-disable @typescript-eslint/no-explicit-any */
interface ProgressData {
  videoId: string;
  timestamp: number;
  duration: number;
  completed: boolean;
  lastWatched: Date;
}

class ProgressManager {
  private storageKey = 'video_progress';
  private progress: Map<string, ProgressData> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private autoSaveDelay = 5000; // 5 seconds

  constructor() {
    this.loadFromStorage();
    
    // Save to localStorage periodically
    setInterval(() => this.saveToStorage(), 30000); // Every 30 seconds
    
    // Save before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.progress = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.progress);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  updateProgress(videoId: string, timestamp: number, duration: number) {
    const completed = timestamp >= duration * 0.9; // Consider 90% as completed
    
    this.progress.set(videoId, {
      videoId,
      timestamp,
      duration,
      completed,
      lastWatched: new Date(),
    });

    // Schedule auto-save
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.saveToStorage();
    }, this.autoSaveDelay);
  }

  getProgress(videoId: string): ProgressData | null {
    return this.progress.get(videoId) || null;
  }

  getAllProgress(): ProgressData[] {
    return Array.from(this.progress.values());
  }

  clearProgress(videoId: string) {
    this.progress.delete(videoId);
    this.saveToStorage();
  }

  clearAllProgress() {
    this.progress.clear();
    this.saveToStorage();
  }

  getCompletedVideos(): string[] {
    return Array.from(this.progress.entries())
      .filter(([, data]) => data.completed)
      .map(([videoId]) => videoId);
  }

  getRecentlyWatched(limit: number = 10): ProgressData[] {
    return Array.from(this.progress.values())
      .sort((a, b) => b.lastWatched.getTime() - a.lastWatched.getTime())
      .slice(0, limit);
  }
}

export const progressManager = new ProgressManager();

// Debounce function for auto-save
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for frequent updates
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
