import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fairTestService from '../../services/FairTestService';
import './Dashboard.css';

const CreatorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Connect wallet (in real app, this would be from wallet provider)
      const mockWallet = '0x' + Math.random().toString(16).substring(2, 42);
      await fairTestService.connectWallet(mockWallet);
      
      // Get real stats from Sui blockchain
      const creatorStats = await fairTestService.getCreatorStats(mockWallet);
      
      setStats([
        { icon: '💰', value: `${creatorStats.totalEarnings} SUI`, label: 'Total Earnings', trend: '-' },
        { icon: '📝', value: creatorStats.totalExams.toString(), label: 'Exams Created', trend: '-' },
        { icon: '👥', value: creatorStats.totalStudents.toString(), label: 'Active Students', trend: '-' },
        { icon: '📊', value: `${creatorStats.platformFees} SUI`, label: 'Platform Fees', trend: '-' },
      ]);
      
      // Get recent exams with stats
      const examsWithStats = await Promise.all(
        creatorStats.exams.slice(0, 3).map(async (exam) => {
          const examStats = await fairTestService.getExamStats(exam.examId);
          return {
            id: exam.examId,
            title: exam.title,
            students: examStats.totalSubmissions,
            pending: examStats.pending,
            completed: examStats.evaluated,
            fee: `${exam.fee} SUI`,
            status: exam.status === 'active' ? 'Active' : 'Inactive',
          };
        })
      );
      
      setRecentExams(examsWithStats);
      setLoading(false);
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="creator-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard data from Sui blockchain...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="creator-dashboard">
        <div className="error-state">
          <h2>⚠️ Error Loading Dashboard</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats || recentExams.length === 0) {
    return (
      <div className="creator-dashboard">
        <div className="empty-state">
          <h2>👋 Welcome to FairTest!</h2>
          <p>You haven't created any exams yet.</p>
          <Link to="/creator/create" className="btn btn-primary">
            ✏️ Create Your First Exam
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="creator-dashboard">
      <div className="greeting-banner">
        <h1 className="greeting-title">Welcome back, Creator! 👋</h1>
        <p className="greeting-subtitle">
          Your exams have reached {stats[2].value} students
        </p>
      </div>

      <div className="stats-grid">
        {stats && stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-header">
              <span className="stat-icon">{stat.icon}</span>
              {stat.trend !== '-' && (
                <span className="stat-trend up">{stat.trend}</span>
              )}
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Exams</h2>
          <Link to="/creator/exams" className="btn btn-ghost">
            View All →
          </Link>
        </div>

        <div className="recent-exams-grid">
          {recentExams.map((exam) => (
            <div key={exam.id} className="exam-card">
              <div className="exam-card-header">
                <div>
                  <h3 className="exam-title">{exam.title}</h3>
                  <div className="exam-meta">
                    <span className="exam-badge">
                      💰 {exam.fee}
                    </span>
                    <span className="exam-badge">
                      ✅ {exam.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="exam-stats">
                <div className="exam-stat">
                  <span className="exam-stat-value">{exam.students}</span>
                  <span className="exam-stat-label">Students</span>
                </div>
                <div className="exam-stat">
                  <span className="exam-stat-value">{exam.pending}</span>
                  <span className="exam-stat-label">Pending</span>
                </div>
                <div className="exam-stat">
                  <span className="exam-stat-value">{exam.completed}</span>
                  <span className="exam-stat-label">Completed</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <Link to="/creator/create" className="btn btn-primary">
          ✏️ Create New Exam
        </Link>
        <Link to="/creator/analytics" className="btn btn-secondary">
          📈 View Analytics
        </Link>
      </div>
    </div>
  );
};

export default CreatorDashboard;
