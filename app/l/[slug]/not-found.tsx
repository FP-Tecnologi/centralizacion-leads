export default function NoDisponible() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Esta página no está disponible</h1>
        <p style={{ color: 'var(--ax-text-muted)' }}>Puede que el enlace esté mal escrito o que la página ya no esté publicada.</p>
      </div>
    </main>
  );
}
