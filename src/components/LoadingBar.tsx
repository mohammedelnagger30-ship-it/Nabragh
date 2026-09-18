import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function LoadingBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(0);

    const t1 = setTimeout(() => setProgress(40), 50);
    const t2 = setTimeout(() => setProgress(70), 200);
    const t3 = setTimeout(() => setProgress(90), 500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (progress >= 90) {
      const t = setTimeout(() => { setProgress(100); setTimeout(() => setVisible(false), 200); }, 100);
      return () => clearTimeout(t);
    }
  }, [progress]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden" dir="ltr">
      <div
        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
    </div>
  );
}
