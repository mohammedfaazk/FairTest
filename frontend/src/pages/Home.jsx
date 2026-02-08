import React from 'react';
import Link from 'next/link';

function Home() {
  return (
    <div className="home-page">
      <section className="hero" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>
          FairTest Protocol
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '800px', margin: '0 auto 2.5rem' }}>
          The world's first decentralized exam protocol with instant off-chain payments,
          immutable blockchain results, and anonymous evaluation.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/creator" className="btn-primary" style={{ padding: '1rem 2rem' }}>Post an Exam</Link>
          <Link href="/student/browse" className="btn-primary" style={{ padding: '1rem 2rem', background: 'transparent', border: '1px solid var(--primary)' }}>Browse Exams</Link>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>⚡ Yellow Network</h3>
          <p>Instant off-chain payments with single on-chain settlement. Gasless UX for listing fees and student registration.</p>
        </div>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>💧 Sui Blockchain</h3>
          <p>Immutable storage for exam metadata, student submissions, and finalized results. Transparent and queryable.</p>
        </div>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', color: '#10b981' }}>🆔 Anonymous UIDs</h3>
          <p>Multi-layered identity system separating payment wallets from evaluation IDs. Privacy-first grading.</p>
        </div>
      </div>

      <section style={{ marginTop: '6rem', backgroundColor: 'var(--card-dark)', padding: '3rem', borderRadius: '1rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>How it Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--primary)' }}>1</div>
            <p style={{ fontWeight: '600' }}>Create</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Faculty pay a Yellow listing fee and mint the exam on Sui.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--primary)' }}>2</div>
            <p style={{ fontWeight: '600' }}>Register</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Students register via Yellow and generate their anonymous UID.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--primary)' }}>3</div>
            <p style={{ fontWeight: '600' }}>Submit</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Results are stored on Sui with a hash that only the student can map to their UID.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--primary)' }}>4</div>
            <p style={{ fontWeight: '600' }}>Evaluate</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Evaluators grade submissions blindly using only the UID_HASH.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
