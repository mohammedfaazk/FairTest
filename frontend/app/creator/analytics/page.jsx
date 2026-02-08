import ClientLayout from '../../ClientLayout';
import Link from 'next/link';

export default function CreatorAnalyticsPage() {
  return (
    <ClientLayout title="Analytics">
      <div className="content-area">
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>Analytics</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Exam performance and engagement metrics. Coming soon.
        </p>
        <Link href="/creator" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Faculty Dashboard</Link>
      </div>
    </ClientLayout>
  );
}
