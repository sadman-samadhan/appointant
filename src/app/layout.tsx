import type { Metadata } from 'next';
import { Cinzel, Jost, Cairo } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ConfirmProvider } from '@/context/ConfirmContext';

// AM Barbershop type: engraved Roman capitals for headings, a geometric Deco sans for text,
// and Cairo for Arabic (admin pages).
const display = Cinzel({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const sans = Jost({ subsets: ['latin'], variable: '--font-sans' });
const arabic = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-arabic' });

export const metadata: Metadata = {
  title: 'AM Barbershop | Fredericton',
  description:
    'Fades, textured cuts, hot towel shaves and the AM Treatment at AM Barbershop, 80 York Street, Fredericton, NB.',
  icons: { icon: '/am-icon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${display.variable} ${sans.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved day/night choice before the page paints, so day mode doesn't flash black. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=JSON.parse(localStorage.getItem('am_theme_settings')||'{}');if(s.darkMode===false)document.documentElement.classList.remove('dark')}catch(e){}",
          }}
        />
      </head>
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
