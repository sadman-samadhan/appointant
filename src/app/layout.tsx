import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ConfirmProvider } from '@/context/ConfirmContext';

export const metadata: Metadata = {
  title: 'B Diamond Barbershop | Fredericton',
  description:
    'Precision cuts, fades, beard trims and hot towel shaves at B Diamond Barbershop, 593 King Street, Fredericton, NB.',
  icons: { icon: '/bdiamond-logo.png' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ToastProvider>
          <ThemeProvider>
            <ConfirmProvider>
              <AuthProvider>{children}</AuthProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
