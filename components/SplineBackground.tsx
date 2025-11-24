'use client';

import { useEffect, useState } from 'react';

interface SplineBackgroundProps {
  scene: string;
  onLoad?: (spline: any) => void;
  onError?: (error: any) => void;
}

export default function SplineBackground({ scene, onLoad, onError }: SplineBackgroundProps) {
  const [Spline, setSpline] = useState<any>(null);

  useEffect(() => {
    // Dynamically import Spline only on client side
    import('@splinetool/react-spline')
      .then((mod) => {
        // The default export is the Spline component
        setSpline(() => mod.default);
      })
      .catch((err) => {
        console.error('Failed to load Spline:', err);
        if (onError) onError(err);
      });
  }, []);

  if (!Spline) {
    return null; // or a loading state
  }

  return <Spline scene={scene} onLoad={onLoad} onError={onError} />;
}

