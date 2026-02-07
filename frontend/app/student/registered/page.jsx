import ClientLayout from '../../ClientLayout';
import Link from 'next/link';

export default function StudentRegisteredPage() {
  return (
    <ClientLayout title="My Exams">
      <div className="content-area">
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>My Registered Exams</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Exams you have registered for. Start from Browse or your dashboard.
        </p>
        <Link href="/student/browse" style={{ color: 'var(--primary)', fontWeight: 600 }}>Browse Exams →</Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>|</span>
        <Link href="/student" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Dashboard</Link>
      </div>
    </ClientLayout>
  );
}
