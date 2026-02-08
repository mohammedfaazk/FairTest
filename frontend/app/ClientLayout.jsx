'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import MainLayout from '../src/components/Layout/MainLayout';

function getRoleFromPath(pathname) {
  if (pathname?.startsWith('/creator')) return 'creator';
  if (pathname?.startsWith('/evaluator')) return 'evaluator';
  return 'student';
}

const TITLES = {
  '/creator': 'Faculty Dashboard',
  '/creator/create': 'Create New Exam',
  '/creator/exams': 'My Exams',
  '/creator/analytics': 'Analytics',
  '/student': 'Student Dashboard',
  '/student/browse': 'Browse Exams',
  '/student/registered': 'My Exams',
  '/student/results': 'My Results',
  '/evaluator': 'Evaluator Dashboard',
  '/evaluator/pending': 'Pending Grading',
  '/evaluator/completed': 'Completed',
};

// Dynamic exam routes - match /student/exam/:id/instructions or /student/exam/:id/take
function getTitleFromPath(pathname) {
  if (pathname?.match(/\/student\/exam\/[^/]+\/instructions/)) return 'Exam Instructions';
  if (pathname?.match(/\/student\/exam\/[^/]+\/take/)) return 'Take Exam';
  if (pathname?.match(/\/evaluator\/exam\/[^/]+\/grade/)) return 'Grade Exam';
  return null;
}

export default function ClientLayout({ children, title }) {
  const pathname = usePathname();
  const roleFromPath = useMemo(() => getRoleFromPath(pathname), [pathname]);
  const [role, setRole] = useState(roleFromPath);
  useEffect(() => setRole(roleFromPath), [roleFromPath]);
  const pageTitle = title ?? getTitleFromPath(pathname) ?? TITLES[pathname] ?? 'FairTest';

  return (
    <MainLayout title={pageTitle} role={role} onRoleChange={setRole}>
      {children}
    </MainLayout>
  );
}
