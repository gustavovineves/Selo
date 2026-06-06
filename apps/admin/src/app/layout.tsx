import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Selo Admin — Painel Operacional',
  description: 'Painel administrativo do Selo — gestão de contestações e operações',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F2F2F7; color: #111827; }
          a { color: inherit; }
          button, textarea, input, select { font-family: inherit; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
