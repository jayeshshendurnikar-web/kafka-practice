export const API_BASE = '/api';

export const fetchHealth = async () => {
  try {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};

export const createOrder = async (orderPayload) => {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create order');
  }
  return data;
};

export const fetchOrders = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/orders${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch orders');
  }
  return data.data || [];
};

export const fetchOrderById = async (orderId) => {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to retrieve order');
  }
  return data.data;
};

export const fetchAnalytics = async () => {
  const res = await fetch(`${API_BASE}/analytics`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch analytics');
  return data.data;
};
