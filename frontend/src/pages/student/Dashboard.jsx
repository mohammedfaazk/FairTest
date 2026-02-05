import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fairTestService from '../../services/FairTestService';
import './Dashboard.css';

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Connect wallet
      const mockWallet = '0x' + Math.random().toString(16).substring(2, 42);
      await fairTestService.connectWallet(mockWallet);
      
      // Get available exams from ENS + Sui
      const exams = await fairTestService.browseExams();
      
      // Get my results from Sui blockchain
      const results = await fairTestService.getMyResults();
      
      // Calculate stats
      const registered = exams.length;
      const completed = results.length;
      const pending = registered - completed;
      const avgScore = results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
        : 0;
      
      setStats([
        { icon: '📚', value: registered.toString(), label: 'Available Exams', color: 'orange' },
        { icon: '✅', value: completed.toString(), label: 'Completed', color: 'success' },
        { icon: '⏳', value: pending.toString(), label: 'Pending', color: 'warning' },
        { icon: '🎯', value: `${avgScore}%`, label: 'Avg Score', color: 'info' },
      ]);
      
      // Format upcoming exams
      setUpcomingExams(exams.slice(0, 2).map(exam => ({
        id: exam.examId,
        title: exam.title,
        creator: exam.ensDomain || 'Unknown',
        date: new Date(exam.createdAt).toISOString().split('T')[0],
        duration: `${exam.duration} min`,
        difficulty: exam.passPercentage > 80 ? 'Advanced' : exam.passPercentage > 60 ? 'Intermediate' : 'Beginner',
        status: 'Available',
      })));
      
      // Format recent results
      setRecentResults(results.slice(0, 2).map(result => ({
        id: result.resultId,
        title: result.examTitle,
        score: result.percentage,
        maxScore: 100,
        rank: 0, // Would need to calculate from all results
        totalStudents: 0, // Would need exam stats
        date: new Date(result.evaluatedAt).toISOString().split('T')[0],
        status: result.passed ? 'Pass' : 'Fail',
      })));
      
      setLoading(false);
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading exams from ENS and Sui blockchain...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-dashboard">
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

  return (
    <div className="student-dashboard">
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome back! 👋</h1>
        <p className="welcome-subtitle">
          {upcomingExams.length > 0 
            ? `You have ${upcomingExams.length} exams available`
            : 'No exams available yet'}
        </p>
      </div>

      <div className="stats-grid">
        {stats && stats.map((stat, index) => (
          <div key={index} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Upcoming Exams</h2>
            <Link to="/student/browse" className="section-link">
              Browse More →
            </Link>
          </div>

          <div className="exams-list">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="exam-card">
                <div className="exam-header">
                  <h3 className="exam-title">{exam.title}</h3>
                  <span className={`difficulty-badge ${exam.difficulty.toLowerCase()}`}>
                    {exam.difficulty}
                  </span>
                </div>

                <div className="exam-meta">
                  <div className="meta-item">
                    <span className="meta-icon">👨‍🏫</span>
                    <span className="meta-text">{exam.creator}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">📅</span>
                    <span className="meta-text">{exam.date}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">⏱️</span>
                    <span className="meta-text">{exam.duration}</span>
                  </div>
                </div>

                <Link
                  to={`/student/take/${exam.id}`}
                  className="btn btn-primary btn-block"
                >
                  Start Exam
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Recent Results</h2>
            <Link to="/student/results" className="section-link">
              View All →
            </Link>
          </div>

          <div className="results-list">
            {recentResults.map((result) => (
              <div key={result.id} className="result-card">
                <div className="result-header">
                  <h3 className="result-title">{result.title}</h3>
                  <span className={`status-badge ${result.status.toLowerCase()}`}>
                    {result.status}
                  </span>
                </div>

                <div className="result-score">
                  <div className="score-circle">
                    <span className="score-value">{result.score}%</span>
                  </div>
                  <div className="score-details">
                    <div className="score-item">
                      <span className="score-label">Score</span>
                      <span className="score-text">
                        {result.score}/{result.maxScore}
                      </span>
                    </div>
                    <div className="score-item">
                      <span className="score-label">Rank</span>
                      <span className="score-text">
                        {result.rank}/{result.totalStudents}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="result-footer">
                  <span className="result-date">📅 {result.date}</span>
                  <Link to={`/student/results/${result.id}`} className="result-link">
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <Link to="/student/browse" className="btn btn-primary">
          🔍 Browse Exams
        </Link>
        <Link to="/student/results" className="btn btn-secondary">
          📊 View All Results
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;
