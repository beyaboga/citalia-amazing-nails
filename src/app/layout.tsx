import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/index.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Citalia',
  description: 'Citalia — panel de administración para salones de belleza.',
  icons: {
    icon: [
      { url: '/citalia-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
  },
  // Evita que el navegador (Google Translate) reescriba el DOM que maneja React.
  // La app ya está en español; su traducción automática rompe la navegación con
  // errores de 'insertBefore'. Ver https://nextjs.org/docs/messages/react-hydration-error
  other: { google: 'notranslate' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" translate="no" className="notranslate">
      <body>{children}
</body>
    </html>
  );
}
