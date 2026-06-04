import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Selo Admin',
  description: 'Painel administrativo do Selo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8f9fa' }}>
        {children}
      </body>
    </html>
  );
}
