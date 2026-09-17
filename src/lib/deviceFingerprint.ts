/**
 * Device fingerprinting for account security.
 * Generates a stable hash from browser/device characteristics.
 * Used to lock student accounts to a single device.
 */

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('nabragh', 2, 2);
    return canvas.toDataURL().slice(-50);
  } catch {
    return '';
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).slice(0, 50);
  } catch {
    return '';
  }
}

function getAudioFingerprint(): string {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    const gain = audioCtx.createGain();
    const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

    gain.gain.value = 0; // mute
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(0);

    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);

    oscillator.stop();
    audioCtx.close();

    // Use a few frequency values as fingerprint
    return Array.from(data.slice(0, 5)).map((v) => v.toFixed(0)).join(',');
  } catch {
    return '';
  }
}

export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  userAgent: string;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const ua = navigator.userAgent;

  // Collect signals
  const signals = [
    ua,
    navigator.language,
    screen.colorDepth.toString(),
    `${screen.width}x${screen.height}`,
    `${screen.availWidth}x${screen.availHeight}`,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() ?? '',
    navigator.maxTouchPoints?.toString() ?? '0',
    getCanvasFingerprint(),
    getWebGLFingerprint(),
  ];

  // Add audio fingerprint (async)
  try {
    signals.push(getAudioFingerprint());
  } catch {
    // ignore
  }

  // Add localStorage test
  try {
    localStorage.setItem('_fp_test', '1');
    localStorage.removeItem('_fp_test');
    signals.push('ls_ok');
  } catch {
    signals.push('ls_fail');
  }

  // Generate hash using SubtleCrypto
  const raw = signals.join('|||');
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fingerprint = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Human-readable device name
  const deviceName = detectDeviceName(ua);

  return { fingerprint, deviceName, userAgent: ua };
}

function detectDeviceName(ua: string): string {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);

  let os = 'Desktop';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';

  if (isTablet) os += ' (Tablet)';
  else if (isMobile) os += ' (Mobile)';

  let browser = 'متصفح';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  return `${browser} على ${os}`;
}

const DEVICE_LOCK_KEY = 'nabragh_device_verified';

export function setDeviceVerified(verified: boolean): void {
  try {
    if (verified) {
      sessionStorage.setItem(DEVICE_LOCK_KEY, '1');
    } else {
      sessionStorage.removeItem(DEVICE_LOCK_KEY);
    }
  } catch {
    // ignore
  }
}

export function isDeviceVerified(): boolean {
  try {
    return sessionStorage.getItem(DEVICE_LOCK_KEY) === '1';
  } catch {
    return false;
  }
}
