export const PipelineTracker = ({ activeOrder }) => {
  if (!activeOrder) {
    return (
      <div className="card pipeline-card empty">
        <div className="pipeline-empty-state">
          <span className="empty-icon">🛰️</span>
          <h3>Kafka Event Pipeline Idle</h3>
          <p>Create an order above to watch events stream across Kafka topics and update MongoDB in real-time.</p>
        </div>
      </div>
    );
  }

  const { orderId, totalAmount, status, payment, notification } = activeOrder;

  // Stages
  const isCreated = true;
  const isPaid = payment?.status === 'SUCCESS';
  const isFailed = payment?.status === 'FAILED' || status === 'PAYMENT_FAILED';
  const isProcessed = isPaid || isFailed;
  const isNotified = notification?.sent === true;

  return (
    <div className="card pipeline-card">
      <div className="card-header">
        <div className="card-title-wrap">
          <span className="card-badge pulse">LIVE STREAM</span>
          <h2 className="card-title">Kafka Event Lifecycle Tracker</h2>
        </div>
        <div className="order-target-pill">
          <span className="pill-muted">ORDER ID:</span>
          <span className="font-mono text-cyan">{orderId}</span>
        </div>
      </div>

      {isFailed && (
        <div className="error-banner payment-failure" role="alert">
          <strong>Payment failed</strong>
          <p>{payment?.failureReason || 'Payment was declined. No money was charged.'}</p>
          <p>{isNotified ? `Payment-failed notification sent to ${notification.recipient}.` : 'Your payment-failed notification is being prepared.'} To try again, create a new order and choose Yes.</p>
        </div>
      )}
      {isPaid && isNotified && <p className="success-banner" role="status">Payment complete. Confirmation sent to {notification.recipient}.</p>}
      <div className="pipeline-stepper">
        {/* Step 1 */}
        <div className={`pipeline-step ${isCreated ? 'completed' : 'pending'}`}>
          <div className="step-icon-wrap">
            <span className="step-icon">🛒</span>
            <div className="step-status-icon">✓</div>
          </div>
          <div className="step-content">
            <span className="step-topic font-mono">TOPIC: order-created</span>
            <h4 className="step-title">Order Created & Saved</h4>
            <p className="step-desc">Persisted to MongoDB with initial status <span className="badge-pending">PENDING</span>.</p>
            <div className="step-meta font-mono">
              <span>Amount: ${totalAmount?.toFixed(2)}</span>
              <span>Partition Key: {orderId.slice(-9)}</span>
            </div>
          </div>
        </div>

        {/* Connector 1 */}
        <div className={`pipeline-connector ${isProcessed ? 'active' : 'animating'}`}>
          <div className="connector-line"></div>
          <span className="connector-badge font-mono">Kafka Event</span>
        </div>

        {/* Step 2 */}
        <div className={`pipeline-step ${isFailed ? 'failed' : isPaid ? 'completed' : 'processing'}`}>
          <div className="step-icon-wrap">
            <span className="step-icon">💳</span>
            <div className="step-status-icon">{isFailed ? '✕' : isPaid ? '✓' : '⟳'}</div>
          </div>
          <div className="step-content">
            <span className="step-topic font-mono">TOPIC: payment-processed</span>
            <h4 className="step-title">{isFailed ? 'Payment Failed' : isPaid ? 'Payment Complete' : 'Processing Payment'}</h4>
            <p className="step-desc">
              {isFailed ? 'Payment was declined. The order remains PAYMENT_FAILED.' : isPaid ? 'Payment succeeded and the transaction was saved.' : 'Waiting for the payment consumer to process your choice.'}
            </p>
            {isFailed ? <div className="step-meta text-rose">{payment?.failureReason}</div> : payment?.transactionId ? (
              <div className="step-meta font-mono text-cyan">
                <span>Txn: {payment.transactionId}</span>
              </div>
            ) : (
              <div className="step-meta font-mono text-muted">Awaiting consumer...</div>
            )}
          </div>
        </div>

        {/* Connector 2 */}
        <div className={`pipeline-connector ${isNotified ? 'active' : isProcessed ? 'animating' : ''}`}>
          <div className="connector-line"></div>
          <span className="connector-badge font-mono">Kafka Event</span>
        </div>

        {/* Step 3 */}
        <div className={`pipeline-step ${isNotified ? 'completed' : isProcessed ? 'processing' : 'waiting'}`}>
          <div className="step-icon-wrap">
            <span className="step-icon">📧</span>
            <div className="step-status-icon">{isNotified ? '✓' : isProcessed ? '⟳' : '○'}</div>
          </div>
          <div className="step-content">
            <span className="step-topic font-mono">TOPIC: notification-sent</span>
            <h4 className="step-title">{isFailed ? 'Payment-Failed Notification' : 'Customer Notification'}</h4>
            <p className="step-desc">
              {isNotified ? (notification.message || 'Payment confirmation sent.') : 'Waiting to send a simulated email with the payment result.'}
            </p>
            {notification?.sent ? (
              <div className="step-meta font-mono text-emerald">
                <span>Sent to: {notification.recipient || activeOrder.customer?.email}</span>
              </div>
            ) : (
              <div className="step-meta font-mono text-muted">Awaiting dispatch...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
