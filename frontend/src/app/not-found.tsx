import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <h1>404 - Portal Not Found</h1>
      <p>The requested security clearance area does not exist.</p>
      <Link href="/" className="glass-btn primary" style={{ marginTop: '20px' }}>
        Return to Hub
      </Link>
    </div>
  );
}
