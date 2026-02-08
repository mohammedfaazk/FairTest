import './globals.css';
import SuiProviders from './SuietProviders';

// Avoid SSG for pages that use wallet (ConnectButton etc.) which can be undefined during prerender
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'FairTest Protocol',
  description: 'Decentralized exam platform with instant payments, anonymous evaluation, and immutable results',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SuiProviders>
          {children}
        </SuiProviders>
      </body>
    </html>
  );
}
