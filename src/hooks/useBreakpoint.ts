
import { useState, useEffect, useMemo } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const useBreakpoint = (): Breakpoint => {
  const [width, setWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  return breakpoint;
};

export default useBreakpoint;
