import { useState } from 'react';

const PRESET_BUNDLES = [
  {
    id: 'kafka-dev',
    label: '⚡ Kafka Mastery Pack',
    customer: { name: 'Alex Mercer', email: 'alex@distributed.io', phone: '+1-555-0199' },
    items: [
      { productId: 'KFK-101', name: 'Designing Event-Driven Systems', price: 54.99, quantity: 1 },
      { productId: 'DEV-202', name: 'Keychron Q1 Pro Mechanical Keyboard', price: 199.0, quantity: 1 },
    ],
  },
  {
    id: 'cloud-infra',
    label: '☁️ Cloud Architect Setup',
    customer: { name: 'Sarah Connor', email: 'sarah@cloudops.net', phone: '+1-555-0842' },
    items: [
      { productId: 'SRV-301', name: 'Dedicated Kafka Node (Annual)', price: 349.5, quantity: 1 },
      { productId: 'MON-404', name: 'UltraWide 38" Curved Monitor', price: 620.0, quantity: 1 },
      { productId: 'ACC-505', name: 'Thunderbolt 4 Docking Station', price: 149.99, quantity: 1 },
    ],
  },
  {
    id: 'starter',
    label: '🌱 Coffee & Code',
    customer: { name: 'Dev Starter', email: 'hello@devworld.org', phone: '+91-9876543210' },
    items: [
      { productId: 'COF-001', name: 'Single Origin Espresso Beans 1kg', price: 28.0, quantity: 2 },
      { productId: 'MUG-002', name: 'Self-Heating Smart Ceramic Mug', price: 89.95, quantity: 1 },
    ],
  },
];

export const OrderForm = ({ onSubmit, isSubmitting, error }) => {
  const [customer, setCustomer] = useState(PRESET_BUNDLES[0].customer);
  const [items, setItems] = useState(PRESET_BUNDLES[0].items);
  const [paymentApproved, setPaymentApproved] = useState(true);

  const applyPreset = (preset) => {
    setCustomer({ ...preset.customer });
    setItems(preset.items.map((it) => ({ ...it })));
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: `PRD-${Math.floor(100 + Math.random() * 900)}`,
        name: 'New Custom Item',
        price: 29.99,
        quantity: 1,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0,
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customer.name.trim() || !customer.email.trim()) {
      alert('Please provide customer name and email');
      return;
    }
    onSubmit({ customer, items, paymentApproved });
  };

  return (
    <div className="card order-form-card">
      <div className="card-header">
        <div className="card-title-wrap">
          <span className="card-badge">STEP 1</span>
          <h2 className="card-title">Create Order & Publish Event</h2>
        </div>
        <span className="card-hint">POST /api/orders &rarr; order-created</span>
      </div>

      <div className="presets-bar">
        <span className="presets-label">Quick Presets:</span>
        <div className="presets-chips">
          {PRESET_BUNDLES.map((bundle) => (
            <button
              key={bundle.id}
              type="button"
              className="preset-chip"
              onClick={() => applyPreset(bundle)}
            >
              {bundle.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        <div className="form-section">
          <h3 className="section-label">Customer Information</h3>
          <div className="form-grid-3">
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                required
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                placeholder="e.g. Alex Mercer"
              />
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                required
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                placeholder="alex@domain.com"
              />
            </div>
            <div className="input-group">
              <label>Phone (Optional)</label>
              <input
                type="text"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                placeholder="+1 555-0199"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header-inline">
            <h3 className="section-label">Order Items ({items.length})</h3>
            <button type="button" className="btn-secondary-sm" onClick={addItem}>
              + Add Item
            </button>
          </div>

          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: '120px' }}>Price ($)</th>
                  <th style={{ width: '90px' }}>Qty</th>
                  <th style={{ width: '110px' }}>Subtotal</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const sub = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          placeholder="Item name"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="table-input font-mono"
                          value={item.price}
                          onChange={(e) => updateItem(idx, 'price', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="table-input font-mono"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          required
                        />
                      </td>
                      <td className="font-mono text-cyan">${sub.toFixed(2)}</td>
                      <td>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon-danger"
                            title="Remove item"
                            onClick={() => removeItem(idx)}
                          >
                            &times;
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <fieldset className="payment-choice" disabled={isSubmitting}>
          <legend className="section-label">Approve payment?</legend>
          <div className="payment-options">
            <label className={paymentApproved ? 'payment-option selected' : 'payment-option'}>
              <input type="radio" name="paymentApproved" checked={paymentApproved} onChange={() => setPaymentApproved(true)} />
              <span><strong>Yes</strong><small>Complete payment</small></span>
            </label>
            <label className={!paymentApproved ? 'payment-option selected declined' : 'payment-option'}>
              <input type="radio" name="paymentApproved" checked={!paymentApproved} onChange={() => setPaymentApproved(false)} />
              <span><strong>No</strong><small>Decline payment</small></span>
            </label>
          </div>
          <p className="text-muted text-xs">Simulated payment. {paymentApproved ? 'A successful payment sends a confirmation email.' : 'The order will be saved with a failed payment and a payment-failed notification. No money is charged.'}</p>
        </fieldset>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <div className="form-footer">
          <div className="total-summary">
            <span className="total-label">Total Payable</span>
            <span className="total-amount font-mono">${totalAmount.toFixed(2)}</span>
          </div>

          <button
            type="submit"
            className="btn-primary-glow"
            disabled={isSubmitting || totalAmount <= 0}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                <span>Publishing to Kafka...</span>
              </>
            ) : (
              <>
                <span>⚡ Place Order & Stream to Kafka</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
