import ClientLayout from '../../ClientLayout';
import Link from 'next/link';

export default function EvaluatorPendingPage() {
  return (
    <ClientLayout title="Pending Grading">
      <div className="content-area">
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Pending Grading</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Submissions awaiting evaluation. Select an exam and grade from the dashboard.
        </p>
        <Link href="/evaluator" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Evaluator Dashboard</Link>
      </div>
    </ClientLayout>
  );
}
