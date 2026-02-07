'use client';

export default function DemoBanner() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  if (!isDemo) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
        color: '#fff',
        textAlign: 'center',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}
    >
      🎬 Demo Mode — Integrations use mock/sandbox data. Connect a wallet to try the flow.
    </div>
  );
}
