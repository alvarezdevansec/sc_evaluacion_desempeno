
import type { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

export const metadata: Metadata = {
  title: 'Evaluación del Desempeño 2026 | ANSEC',
  description: 'Sistema de evaluación del desempeño de servidores públicos.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
