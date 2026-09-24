export const AnalyticsDashboard = ({ analytics, error }) => {
  const metrics = [
    ['Total orders', 'totalOrders', 'Orders received through Kafka', ''],
    ['Payments completed', 'paymentsCompleted', 'Successful payments', 'text-emerald'],
    ['Payments failed', 'paymentsFailed', 'Declined payments', 'text-rose'],
    ['Payments pending', 'paymentsPending', 'Waiting for processing', 'text-amber'],
    ['Notifications sent', 'notificationsSent', 'Simulated email deliveries', 'text-cyan'],
    ['Notifications pending', 'notificationsPending', 'Payment processed, awaiting email', 'text-amber'],
  ];
  return (
    <section className="card analytics-card" aria-labelledby="analytics-heading">
      <div className="card-header">
        <div className="card-title-wrap">
          <span className="card-badge">ANALYTICS</span>
          <h2 id="analytics-heading" className="card-title">Order & Payment Dashboard</h2>
        </div>
        <span className="card-hint">Kafka consumer totals · refreshes every 3 seconds</span>
      </div>
      {error && <p className="error-banner" role="alert">Analytics unavailable. {analytics ? 'Showing last known totals. ' : ''}{error}</p>}
      <div className="analytics-grid" aria-busy={!analytics && !error}>
        {metrics.map(([label, key, hint, color]) => (
          <div className="analytics-metric" key={key}>
            <span className="metric-label">{label}</span>
            <strong className={`analytics-value font-mono ${color}`}>{analytics ? analytics[key].toLocaleString() : '—'}</strong>
            <span className="text-muted text-xs">{hint}</span>
          </div>
        ))}
      </div>
      <div className="analytics-footer">
        <span className="text-muted text-xs">Consumes order-created, payment-processed & notification-sent. Totals update as events arrive.</span>
        <span>Revenue collected <strong className="text-emerald">{analytics ? `$${analytics.totalRevenue.toFixed(2)}` : '—'}</strong></span>
        <span>Success emails <strong>{analytics?.successNotifications ?? '—'}</strong></span>
        <span>Failure emails <strong className="text-rose">{analytics?.failureNotifications ?? '—'}</strong></span>
        <span>Cancelled orders <strong>{analytics?.ordersCancelled ?? '—'}</strong></span>
        <span className="text-muted text-xs">{analytics ? `Updated ${new Date(analytics.updatedAt).toLocaleTimeString()}` : error ? 'Waiting for connection' : 'Loading analytics…'}</span>
      </div>
    </section>
  );
};
