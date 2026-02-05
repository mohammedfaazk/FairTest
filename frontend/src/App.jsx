import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './styles/design-system.css';
import './App.css';

// Layout
import MainLayout from './components/Layout/MainLayout';

// Creator Pages
import CreatorDashboard from './pages/creator/Dashboard';
import CreateExam from './pages/creator/CreateExam';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import BrowseExams from './pages/student/BrowseExams';
import TakeExam from './pages/student/TakeExam';
import ViewResults from './pages/student/ViewResults';

// Evaluator Pages
import EvaluatorDashboard from './pages/evaluator/EvaluatorDashboard';

function App() {
    const [role, setRole] = useState('student');

    const getPageTitle = (path) => {
        const titles = {
            '/creator': 'Creator Dashboard',
            '/creator/create': 'Create New Exam',
            '/creator/exams': 'My Exams',
            '/creator/analytics': 'Analytics',
            '/student': 'Student Dashboard',
            '/student/browse': 'Browse Exams',
            '/student/registered': 'My Registered Exams',
            '/student/results': 'My Results',
            '/evaluator': 'Evaluator Dashboard',
            '/evaluator/pending': 'Pending Grading',
            '/evaluator/completed': 'Completed Evaluations',
        };
        return titles[path] || 'FairTest';
    };

    return (
        <Routes>
            {/* Creator Routes */}
            <Route
                path="/creator"
                element={
                    <MainLayout title="Creator Dashboard" role="creator" onRoleChange={setRole}>
                        <CreatorDashboard />
                    </MainLayout>
                }
            />
            <Route
                path="/creator/create"
                element={
                    <MainLayout title="Create New Exam" role="creator" onRoleChange={setRole}>
                        <CreateExam />
                    </MainLayout>
                }
            />

            {/* Student Routes */}
            <Route
                path="/student"
                element={
                    <MainLayout title="Student Dashboard" role="student" onRoleChange={setRole}>
                        <StudentDashboard />
                    </MainLayout>
                }
            />
            <Route
                path="/student/browse"
                element={
                    <MainLayout title="Browse Exams" role="student" onRoleChange={setRole}>
                        <BrowseExams />
                    </MainLayout>
                }
            />
            <Route
                path="/student/take/:examId"
                element={
                    <MainLayout title="Take Exam" role="student" onRoleChange={setRole}>
                        <TakeExam />
                    </MainLayout>
                }
            />
            <Route
                path="/student/results"
                element={
                    <MainLayout title="My Results" role="student" onRoleChange={setRole}>
                        <ViewResults />
                    </MainLayout>
                }
            />

            {/* Evaluator Routes */}
            <Route
                path="/evaluator"
                element={
                    <MainLayout title="Evaluator Dashboard" role="evaluator" onRoleChange={setRole}>
                        <EvaluatorDashboard />
                    </MainLayout>
                }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/student" replace />} />
        </Routes>
    );
}

export default App;
