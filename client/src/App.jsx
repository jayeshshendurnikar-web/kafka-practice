import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Header } from './components/Header';
import { OrderForm } from './components/OrderForm';
import { PipelineTracker } from './components/PipelineTracker';
import { OrdersList } from './components/OrdersList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { fetchHealth, createOrder, fetchOrders, fetchOrderById, fetchAnalytics } from './services/api';

function App() {
  const [health, setHealth] = useState(null);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [ordersError, setOrdersError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const refreshInFlight = useRef(false);

  const loadOverview = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    const [feed, totals] = await Promise.allSettled([fetchOrders({ limit: 100 }), fetchAnalytics()]);
    if (feed.status === 'fulfilled') {
      setOrders(feed.value);
      setOrdersError('');
      setActiveOrder((current) => current || feed.value[0] || null);
    } else setOrdersError(feed.reason.message);
    if (totals.status === 'fulfilled') {
      setAnalytics(totals.value);
      setAnalyticsError('');
    } else setAnalyticsError(totals.reason.message);
    setIsLoadingOrders(false);
    refreshInFlight.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const update = async () => {
      const result = await fetchHealth();
      if (!cancelled) setHealth(result);
    };
    void update();
    const interval = setInterval(update, 6000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const initial = setTimeout(loadOverview, 0);
    const interval = setInterval(loadOverview, 3000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [loadOverview]);

  const activeOrderId = activeOrder?.orderId;
  const finished = activeOrder?.notification?.sent || activeOrder?.status === 'CANCELLED';
  useEffect(() => {
    if (!activeOrderId || finished) return;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const fresh = await fetchOrderById(activeOrderId);
        if (cancelled) return;
        setActiveOrder((current) => current?.orderId === activeOrderId ? fresh : current);
        setTrackingError('');
        setOrders((current) => current.map((order) => order.orderId === activeOrderId ? fresh : order));
        if (fresh.notification?.sent || fresh.status === 'CANCELLED') {
          void loadOverview();
          return;
        }
      } catch (error) {
        if (!cancelled) setTrackingError(`Unable to refresh this order: ${error.message}. Retrying…`);
      }
      if (!cancelled) timer = setTimeout(poll, 800);
    };
    timer = setTimeout(poll, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeOrderId, finished, loadOverview]);

  const handleCreateOrder = async (payload) => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await createOrder(payload);
      setActiveOrder(result.data);
      setTrackingError('');
      await loadOverview();
    } catch (error) {
      setSubmitError(`Could not place order: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <Header health={health} totalOrders={analytics?.totalOrders} totalRevenue={analytics?.totalRevenue} />
      <div className="main-deck">
        <AnalyticsDashboard analytics={analytics} error={analyticsError} />
        <OrderForm onSubmit={handleCreateOrder} isSubmitting={isSubmitting} error={submitError} />
        {trackingError && <p className="error-banner" role="alert">{trackingError}</p>}
        <PipelineTracker activeOrder={activeOrder} />
        {ordersError && <p className="error-banner" role="alert">Orders could not refresh. {ordersError}</p>}
        <OrdersList orders={orders} onSelectOrder={(order) => { setActiveOrder(order); setTrackingError(''); }}
          selectedOrderId={activeOrderId} onRefresh={() => { setIsLoadingOrders(true); void loadOverview(); }} isLoading={isLoadingOrders} />
      </div>
    </div>
  );
}

export default App;
