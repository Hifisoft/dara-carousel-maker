import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DARA V2 — Professional Social Carousel Studio',
  description: 'AI-native carousel design studio for Instagram, LinkedIn, and social media.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
