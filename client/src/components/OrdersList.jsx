import { useState } from 'react';

export const OrdersList = ({ orders, onSelectOrder, selectedOrderId, onRefresh, isLoading }) => {
  const [filter, setFilter] = useState('ALL');

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ALL') return true;
    if (filter === 'PAID') return o.payment?.status === 'SUCCESS';
    if (filter === 'NOTIFIED') return o.notification?.sent;
    return o.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAYMENT_FAILED':
        return <span className="status-badge badge-failed">PAYMENT FAILED</span>;
      case 'NOTIFIED':
        return <span className="status-badge badge-notified">NOTIFIED</span>;
      case 'PAID':
        return <span className="status-badge badge-paid">PAID</span>;
      case 'PENDING':
        return <span className="status-badge badge-pending">PENDING</span>;
      default:
        return <span className="status-badge badge-default">{status}</span>;
    }
  };

  return (
    <div className="card orders-list-card">
      <div className="card-header">
        <div className="card-title-wrap">
          <span className="card-badge">MONGODB</span>
          <h2 className="card-title">Recent Orders ({filteredOrders.length} of latest 100)</h2>
        </div>

        <div className="orders-header-actions">
          <div className="filter-chips">
            {['ALL', 'NOTIFIED', 'PAID', 'PAYMENT_FAILED', 'PENDING'].map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-chip ${filter === st ? 'active' : ''}`}
                onClick={() => setFilter(st)}
              >
                {st.replaceAll('_', ' ')}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-refresh"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Orders"
          >
            {isLoading ? '⟳' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-orders-view">
          <p>No orders found matching the criteria.</p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment Txn</th>
                <th>Notification</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isSelected = order.orderId === selectedOrderId;
                const formattedDate = new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr
                    key={order.orderId}
                    className={`order-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => onSelectOrder(order)}
                  >
                    <td>
                      <div className="order-id-cell font-mono">
                        <span className="id-text">{order.orderId}</span>
                        {isSelected && <span className="viewing-pill">TRACKING</span>}
                      </div>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className="customer-name">{order.customer?.name}</span>
                        <span className="customer-email">{order.customer?.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="items-count-badge">
                        {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="font-mono text-cyan">${order.totalAmount?.toFixed(2)}</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>
                      {order.payment?.status === 'FAILED' ? (
                        <span className="text-rose text-xs">{order.payment.failureReason}</span>
                      ) : order.payment?.transactionId ? (
                        <span className="font-mono text-muted text-xs">
                          {order.payment.transactionId}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Pending...</span>
                      )}
                    </td>
                    <td>
                      <span className={order.notification?.sent ? 'text-emerald text-xs' : 'text-muted text-xs'}>
                        {order.notification?.sent ? (order.payment?.status === 'FAILED' ? 'Failure email sent' : 'Confirmation sent') : 'Awaiting notification'}
                      </span>
                    </td>
                    <td className="font-mono text-muted text-xs">{formattedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
