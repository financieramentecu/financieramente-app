'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>¡Algo salió mal inesperadamente!</h2>
          <p>Hemos notificado a nuestro equipo técnico.</p>
          <button 
            onClick={() => reset()}
            style={{ padding: '10px 20px', marginTop: '1rem', cursor: 'pointer' }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
