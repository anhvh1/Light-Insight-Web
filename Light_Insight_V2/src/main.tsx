import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';
import { router } from './router';
import { QueryProvider } from './QueryProvider';
import { AlarmStreamProvider } from './features/alarms/AlarmStreamProvider';

const rootElement = document.getElementById('root');
if (!rootElement || !rootElement.innerHTML) {
  const root = createRoot(rootElement!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
  root.render(
    <StrictMode>
      <QueryProvider>
        <AlarmStreamProvider>
          <RouterProvider router={router} />
        </AlarmStreamProvider>
      </QueryProvider>
    </StrictMode>
  );
}
