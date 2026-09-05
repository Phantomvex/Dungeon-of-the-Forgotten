import { useEffect, useState } from 'react';

export function useTouchControls() {
  const detect = () => window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1 && window.innerWidth < 1100;
  const [touch, setTouch] = useState(detect);
  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => setTouch(detect());
    media.addEventListener('change', update); window.addEventListener('resize', update);
    return () => { media.removeEventListener('change', update); window.removeEventListener('resize', update); };
  }, []);
  return touch;
}