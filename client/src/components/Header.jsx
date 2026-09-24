export const Header = ({ health, totalOrders, totalRevenue }) => {
  const isHealthy = health?.status === 'ok';

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <span className="logo-icon">⚡</span>
          <div className="logo-ping"></div>
        </div>
        <div>
          <div className="brand-title-wrap">
            <h1 className="brand-title">KafkaPulse</h1>
            <span className="brand-tag">EVENT-DRIVEN</span>
          </div>
          <p className="brand-subtitle">Real-time Order Processing & Microservices Stream</p>
        </div>
      </div>

      <div className="header-meta">
        <div className="metric-pill">
          <span className="metric-label">ORDERS</span>
          <span className="metric-val">{totalOrders ?? '—'}</span>
        </div>

        <div className="metric-pill">
          <span className="metric-label">COLLECTED</span>
          <span className="metric-val text-emerald">{totalRevenue == null ? '—' : `$${totalRevenue.toFixed(2)}`}</span>
        </div>

        <div className={`health-pill ${isHealthy ? 'healthy' : 'degraded'}`}>
          <span className="status-dot"></span>
          <span className="status-text">{isHealthy ? 'KAFKA + DB LIVE' : 'CONNECTING...'}</span>
        </div>
      </div>
    </header>
  );
};
