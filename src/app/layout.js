import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { LanguageProvider } from '@/context/LanguageContext';

export const metadata = {
  title: 'AssetIQ - Enterprise IT Asset Management',
  description: 'Manage and track all your IT assets with AssetIQ',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <LanguageProvider>
                {children}
              </LanguageProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

