import ClientLayout from '../../ClientLayout';
import Link from 'next/link';

export default function EvaluatorCompletedPage() {
  return (
    <ClientLayout title="Completed">
      <div className="content-area">
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Completed</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Evaluations you have completed. Results are stored on-chain.
        </p>
        <Link href="/evaluator" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Evaluator Dashboard</Link>
      </div>
    </ClientLayout>
  );
}
