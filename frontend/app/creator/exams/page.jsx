import ClientLayout from '../../ClientLayout';
import Link from 'next/link';

export default function CreatorExamsPage() {
  return (
    <ClientLayout title="My Exams">
      <div className="content-area">
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>My Exams</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Exams you have created. View and manage from the dashboard.
        </p>
        <Link href="/creator" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Faculty Dashboard</Link>
      </div>
    </ClientLayout>
  );
}
