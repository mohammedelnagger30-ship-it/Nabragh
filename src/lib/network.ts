/* eslint-disable @typescript-eslint/no-explicit-any */
export function isOnline(): boolean {
  return navigator.onLine;
}

export function getNetworkType(): string {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return connection?.effectiveType || 'unknown';
}

export function isSlowNetwork(): boolean {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return false;
  
  const slowTypes = ['slow-2g', '2g', '3g'];
  return slowTypes.includes(connection.effectiveType) || (connection.saveData === true);
}

export function addNetworkListeners(
  onOnline: () => void,
  onOffline: () => void,
  onChange?: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  if (onChange) {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', onChange);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        connection.removeEventListener('change', onChange);
      };
    }
  }
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    const attempt = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          reject(error);
          return;
        }
        
        const backoffDelay = delay * Math.pow(2, retries - 1);
        setTimeout(attempt, backoffDelay);
      }
    };
    
    attempt();
  });
}
