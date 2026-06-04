export default function AdminHomePage() {
  return (
    <main style={{ padding: '48px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#1a1a2e', fontSize: '2rem', marginBottom: '8px' }}>Selo Admin</h1>
      <p style={{ color: '#666', marginBottom: '48px' }}>
        Painel administrativo — disponível na Fase 4.
      </p>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '24px',
        }}
      >
        <h2 style={{ color: '#1a1a2e', fontSize: '1.2rem', marginTop: 0 }}>Status da API</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Configure <code>NEXT_PUBLIC_API_URL</code> no <code>.env.local</code> para conectar à API.
        </p>
      </div>
    </main>
  );
}
