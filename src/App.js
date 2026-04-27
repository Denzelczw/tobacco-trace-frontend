import React, { useState } from 'react';
import './App.css';
import RegisterBaleForm from './RegisterBaleForm';
import {
  Leaf, LayoutDashboard, ClipboardList, ShoppingCart,
  AlertTriangle, BookOpen, LogOut, User, Wallet,
  Shield, Search, X, ChevronRight, Hash,
  TrendingUp, Menu, Download
} from 'lucide-react';

const API_BASE_URL = 'https://tobacco-trace-backend.onrender.com';

// ── Status → badge class ──────────────────────────────────────────
function statusBadge(status) {
  if (!status) return 'badge';
  const s = status.toUpperCase();
  if (s === 'SOLD')          return 'badge green';
  if (s === 'ON_AUCTION')    return 'badge blue';
  if (s === 'NON_COMPLIANT') return 'badge red';
  if (s === 'CREATED')       return 'badge';
  return 'badge';
}

function riskBadge(level) {
  if (!level) return 'badge';
  if (level === 'HIGH')   return 'badge red';
  if (level === 'MEDIUM') return 'badge amber';
  return 'badge green';
}

export default function App() {
  const [user, setUser]                           = useState(null);
  const [view, setView]                           = useState('DASHBOARD');
  const [loginCreds, setLoginCreds]               = useState({ growerId: '', nationalId: '' });
  const [loginError, setLoginError]               = useState('');
  const [bales, setBales]                         = useState([]);
  const [bidAmount, setBidAmount]                 = useState({});
  const [auditFilter, setAuditFilter]             = useState('ALL');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [traceModal, setTraceModal]               = useState(null);
  const [sidebarOpen, setSidebarOpen]             = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res  = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCreds)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setLoginError('');
        fetchBales();
        if (data.user.role === 'ADMIN') setView('RISK_MONITOR'); else setView('DASHBOARD');
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
    } catch { setLoginError('Server error. Please try again.'); }
  };

  const fetchBales = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bales`);
      setBales(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleAcceptBid = async (baleId) => {
    setProcessingPayment(true);
    setTimeout(async () => {
      const res  = await fetch(`${API_BASE_URL}/api/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baleId, farmerId: user.id })
      });
      const data = await res.json();
      setProcessingPayment(false);
      if (data.success) {
        alert('✅ ' + data.message);
        fetchBales();
        setUser({ ...user, wallet: user.wallet + (data.netPayout || 100) });
      } else {
        alert('🛑 ' + data.error);
        fetchBales();
      }
    }, 3000);
  };

  const exportBalesCSV = () => window.open(`${API_BASE_URL}/api/bales/export`, '_blank');

  const navigate = (v) => { setView(v); closeSidebar(); };

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="brand-logo">
            <div className="logo-icon"><Leaf size={20} /></div>
            <h1>Tobacco Trace</h1>
          </div>
          <p>Secure blockchain auction floor. Sign in to continue.</p>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Grower ID"
              onChange={e => setLoginCreds({ ...loginCreds, growerId: e.target.value })} />
            <input type="password" placeholder="National ID"
              onChange={e => setLoginCreds({ ...loginCreds, nationalId: e.target.value })} />
            <button type="submit">Sign In</button>
          </form>
          {loginError && <p className="error">{loginError}</p>}
          <div className="demo-hint">
            <small>🌿 Farmer — G-12345 / 63-111111-F-12</small>
            <small>💰 Buyer — BAT-001 / 99-999999-B-99</small>
            <small>🛡️ Admin — TIMB-001 / 00-000000-A-00</small>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // NAV ITEMS
  // ─────────────────────────────────────────────
  const navItems = [];
  if (user.role !== 'ADMIN') navItems.push({ id: 'DASHBOARD',    label: 'Floor Overview',  Icon: LayoutDashboard });
  if (user.role === 'FARMER') navItems.push({ id: 'REGISTER',    label: 'Register Bale',   Icon: ClipboardList });
  if (user.role === 'BUYER')  navItems.push({ id: 'MARKET',      label: 'Place Bids',      Icon: ShoppingCart });
  if (user.role === 'ADMIN') {
    navItems.push({ id: 'RISK_MONITOR', label: 'Risk Monitoring', Icon: AlertTriangle });
    navItems.push({ id: 'AUDIT',        label: 'Audit Ledger',    Icon: BookOpen });
  }

  // ─────────────────────────────────────────────
  // MAIN APP
  // ─────────────────────────────────────────────
  return (
    <div className="dashboard-layout">

      {/* ── Mobile menu button ── */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
        <Menu size={20} />
      </button>

      {/* ── Sidebar overlay (mobile) ── */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Leaf size={18} /></div>
          <span>Tobacco Trace</span>
        </div>

        <div className="user-profile">
          <div className="avatar"><User size={16} /></div>
          <div className="user-info">
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </div>

        <nav>
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => navigate(id)} className={view === id ? 'active' : ''}>
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button className="logout" onClick={() => { setUser(null); setView('DASHBOARD'); }}>
            <LogOut size={16} />
            Sign Out
          </button>
        </nav>
      </aside>

      {/* ── EcoCash Modal ── */}
      {processingPayment && (
        <div className="modal-overlay">
          <div className="ecash-modal">
            <h2>Processing Payment</h2>
            <p>Executing smart contract and routing funds via EcoCash to +263 77X XXX XXX.</p>
            <div className="ecash-spinner">⟳</div>
          </div>
        </div>
      )}

      {/* ── Trace Modal ── */}
      {traceModal && (
        <div className="modal-overlay" onClick={() => setTraceModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Hash size={16} /> Immutable Audit Trail</h3>
              <button className="modal-close" onClick={() => setTraceModal(null)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Bale ID</div>
                  <div className="info-value" style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--accent)' }}>{traceModal.id}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Status</div>
                  <div className="info-value"><span className={statusBadge(traceModal.status)}>{traceModal.status}</span></div>
                </div>
                <div className="info-item">
                  <div className="info-label">Farmer</div>
                  <div className="info-value">{traceModal.farmerName || traceModal.farmerId}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Destination</div>
                  <div className="info-value" style={{ fontSize: '11px' }}>{traceModal.destination || '—'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Batch</div>
                  <div className="info-value">{traceModal.numberOfBales} bale(s) · {traceModal.weight}kg</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Registered</div>
                  <div className="info-value">{traceModal.registrationDate ? new Date(traceModal.registrationDate).toLocaleDateString() : '—'}</div>
                </div>
              </div>

              {traceModal.inputs && traceModal.inputs.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>Inputs Declared</span><br />
                  <span style={{ color: 'var(--text-primary)', marginTop: '3px', display: 'block' }}>{traceModal.inputs.join(', ')}</span>
                </div>
              )}

              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Cryptographic Event Chain</p>
              <div className="timeline">
                {traceModal.history && traceModal.history.map((evt, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-action">{evt.action}</div>
                    <div className="timeline-meta">{new Date(evt.timestamp).toLocaleString()} · {evt.actor}</div>
                    <div className="timeline-details">
                      {evt.details}
                      <span className="timeline-hash">⬡ {evt.hash.substring(0, 40)}...</span>
                    </div>
                  </div>
                ))}
                {(!traceModal.history || traceModal.history.length === 0) && (
                  <p style={{ color: 'var(--red)', fontSize: '13px' }}>No history found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="content">
        <header>
          <h2>{view.replace(/_/g, ' ')}</h2>
          {user.role === 'FARMER' && (
            <div className="wallet-badge">
              <Wallet size={13} />
              EcoCash Disbursed:
              <span>${user.wallet}.00</span>
            </div>
          )}
          {user.role === 'BUYER' && (
            <div className="wallet-badge">
              <TrendingUp size={13} />
              Corporate Escrow:
              <span>${user.wallet}.00</span>
            </div>
          )}
          {user.role === 'ADMIN' && (
            <div className="wallet-badge admin">
              <Shield size={13} />
              System Access:
              <span>REGULATOR ORACLE</span>
            </div>
          )}
        </header>

        <div className="page-body">

          {/* ── DASHBOARD ── */}
          {view === 'DASHBOARD' && (
            <div className="ledger-view">
              <h3>Live Auction Floor</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Batch</th><th>Variety</th><th>Weight</th>
                      <th>Eco-Score</th><th>Floor Price</th><th>Destination</th>
                      <th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bales.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No bales registered yet.</td></tr>
                    )}
                    {bales.map(b => (
                      <tr key={b.id}>
                        <td>
                          <strong style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent)' }}>{b.id}</strong><br />
                          <button className="trace-btn" onClick={() => setTraceModal(b)}>
                            <Search size={10} /> View Trace
                          </button>
                        </td>
                        <td>{b.variety || '—'}</td>
                        <td>
                          <strong>{b.weight} kg</strong>
                          {b.numberOfBales > 1 && <><br /><small style={{ color: 'var(--text-muted)' }}>{b.numberOfBales} bales</small></>}
                        </td>
                        <td>
                          <strong style={{ color: b.woodScore > 30 ? 'var(--red)' : 'var(--green)' }}>{b.woodScore}</strong>
                        </td>
                        <td><strong style={{ color: 'var(--text-primary)' }}>${b.floorPrice || '—'}</strong></td>
                        <td><small style={{ color: 'var(--text-muted)' }}>{b.destination || '—'}</small></td>
                        <td><span className={statusBadge(b.status)}>{b.status}</span></td>
                        {user.role === 'FARMER' && (
                          <td>
                            {b.status === 'ON_AUCTION' && b.farmer === user.id && (
                              <button className="btn btn-success" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => handleAcceptBid(b.id)}>
                                <ChevronRight size={13} /> Accept ${b.highestBid}
                              </button>
                            )}
                            {b.riskLevel === 'HIGH' && b.status !== 'SOLD' && (
                              <span className="badge red">Locked</span>
                            )}
                            {b.status === 'SOLD' && b.receipt && (
                              <div className="receipt-card">
                                <div className="receipt-row"><span>Gross</span><span>${b.receipt.gross}</span></div>
                                <div className="receipt-row"><span>Levies</span><span>-${(b.receipt.timbLevy + b.receipt.platformFee).toFixed(2)}</span></div>
                                <div className="receipt-row net"><span>Net Payout</span><span>${b.receipt.netPayout}</span></div>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── RISK MONITOR ── */}
          {view === 'RISK_MONITOR' && (
            <div className="ledger-view">
              <div className="risk-banner">
                <AlertTriangle size={18} className="risk-icon" />
                <div>
                  <h4>Live Smart Contract Triggers</h4>
                  <p>Algorithms scanning for: High-Ratio Discrepancies, Geographic Hotspots, and Offline Farmer requests.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Batch ID</th><th>Risk Level</th><th>Trigger Reason</th><th>Oracle Action</th></tr>
                  </thead>
                  <tbody>
                    {bales.filter(b => b.riskLevel && b.riskLevel !== 'LOW').length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No risk flags at this time.</td></tr>
                    )}
                    {bales.filter(b => b.riskLevel && b.riskLevel !== 'LOW').map(bale => (
                      <tr key={bale.id}>
                        <td>
                          <strong>{bale.id}</strong><br />
                          <small style={{ color: 'var(--text-muted)' }}>Farm: {bale.farmerId || bale.farmer}</small>
                        </td>
                        <td><span className={riskBadge(bale.riskLevel)}>{bale.riskLevel}</span></td>
                        <td style={{ maxWidth: '280px', fontSize: '12px' }}>{bale.riskReason}</td>
                        <td style={{ fontSize: '12px', color: 'var(--amber)' }}>{bale.officerAssigned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── AUDIT LEDGER ── */}
          {view === 'AUDIT' && (
            <div className="ledger-view">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: '13px', outline: 'none' }}>
                  <option value="ALL">All Records</option>
                  <option value="NON_COMPLIANT">Environmental Violations</option>
                </select>
                <button className="btn btn-success" onClick={exportBalesCSV}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Batch ID</th><th>Farmer</th><th>Registered</th>
                      <th>Destination</th><th>Inputs</th><th>Photo</th>
                      <th>Eco-Score</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bales.filter(b => auditFilter === 'ALL' || b.status === auditFilter).map(bale => (
                      <tr key={bale.id}>
                        <td>
                          <strong style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--accent)' }}>{bale.id}</strong><br />
                          <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>📍 {bale.gps || 'OFFLINE'}</small><br />
                          <button className="trace-btn" onClick={() => setTraceModal(bale)}>
                            <Search size={10} /> View Trace
                          </button>
                        </td>
                        <td>{bale.farmerName || bale.farmerId || bale.farmer}</td>
                        <td><small>{bale.registrationDate ? new Date(bale.registrationDate).toLocaleDateString() : '—'}</small></td>
                        <td><small style={{ color: 'var(--text-muted)' }}>{bale.destination || '—'}</small></td>
                        <td><small style={{ color: 'var(--text-muted)' }}>{bale.inputs && bale.inputs.length > 0 ? bale.inputs.join(', ') : 'None'}</small></td>
                        <td><small style={{ color: 'var(--text-muted)' }}>{bale.photoEvidence}</small></td>
                        <td><strong style={{ color: bale.woodScore > 30 ? 'var(--red)' : 'var(--green)' }}>{bale.woodScore}</strong></td>
                        <td><span className={statusBadge(bale.status)}>{bale.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REGISTER BALE ── */}
          {view === 'REGISTER' && (
            <RegisterBaleForm user={user} apiBase={API_BASE_URL} onSuccess={fetchBales} />
          )}

          {/* ── MARKET ── */}
          {view === 'MARKET' && (
            <div className="ledger-view">
              <h3>Active Bidding</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>ID</th><th>Grower</th><th>Variety</th><th>Weight</th><th>Floor Price</th><th>Current Bid</th><th>Your Offer</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {bales.filter(b => b.status === 'CREATED' || b.status === 'ON_AUCTION').length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No active bales available for bidding.</td></tr>
                    )}
                    {bales.filter(b => b.status === 'CREATED' || b.status === 'ON_AUCTION').map(bale => (
                      <tr key={bale.id}>
                        <td><strong style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--accent)' }}>{bale.id}</strong></td>
                        <td>{bale.farmerName || bale.farmerId}</td>
                        <td>{bale.variety || '—'}</td>
                        <td>{bale.weight} kg</td>
                        <td><strong style={{ color: 'var(--accent)' }}>${bale.floorPrice || '—'}</strong></td>
                        <td>{bale.highestBid ? <strong style={{ color: 'var(--amber)' }}>${bale.highestBid}</strong> : <span style={{ color: 'var(--text-muted)' }}>No bids</span>}</td>
                        <td>
                          <input type="number" placeholder="0"
                            style={{ width: '90px', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: '13px', outline: 'none' }}
                            onChange={e => setBidAmount({ ...bidAmount, [bale.id]: e.target.value })} />
                        </td>
                        <td>
                          <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '12px' }}
                            onClick={async () => {
                              const amount = bidAmount[bale.id];
                              if (!amount) return alert('Enter an amount!');
                              if (amount < bale.floorPrice) return alert(`Floor price is $${bale.floorPrice}`);
                              const res  = await fetch(`${API_BASE_URL}/api/bid`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ baleId: bale.id, buyerId: user.id, amount: parseInt(amount) })
                              });
                              const data = await res.json();
                              if (data.success) { alert('Bid placed!'); fetchBales(); } else { alert(data.error); }
                            }}>
                            Place Bid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}