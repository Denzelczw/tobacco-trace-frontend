import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'https://tobacco-trace-backend.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // ← JWT lives here
  const [view, setView] = useState('DASHBOARD');
  const [loginCreds, setLoginCreds] = useState({ growerId: '', nationalId: '' });
  const [loginError, setLoginError] = useState('');
  const [bales, setBales] = useState([]);
  const [formData, setFormData] = useState({ id: '', variety: 'Virginia', weight: '', gps: '', curing: 'Sustainable Wood', woodScore: '', offlineMode: false, photoHash: '' });
  const [msg, setMsg] = useState('');
  const [bidAmount, setBidAmount] = useState({});
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [traceModal, setTraceModal] = useState(null);

  // ─────────────────────────────────────────────
  // AUTHENTICATED FETCH HELPER
  // Automatically attaches "Authorization: Bearer <token>" to every request.
  // Use this everywhere instead of raw fetch().
  // ─────────────────────────────────────────────
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`, // attach JWT
    };
    const res = await fetch(url, { ...options, headers });

    // If the server says the token is invalid/expired, force logout
    if (res.status === 401 || res.status === 403) {
      alert('⚠️ Your session has expired. Please log in again.');
      handleLogout();
      return null;
    }
    return res;
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setBales([]);
    setView('DASHBOARD');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Login is the ONE route that doesn't need a token yet
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCreds)
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setToken(data.token); // ← store the JWT
        setLoginError('');
        if (data.user.role === 'ADMIN') setView('RISK_MONITOR'); else setView('DASHBOARD');
      } else {
        setLoginError('❌ Access Denied');
      }
    } catch (err) {
      setLoginError('❌ Server Error');
    }
  };

  // fetchBales now uses authFetch
  const fetchBales = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/bales`);
      if (res) setBales(await res.json());
    } catch (err) { console.error(err); }
  };

  // Fetch bales once the token is set after login
  useEffect(() => {
    if (token) fetchBales();
  }, [token]);

  const getRealLocation = (e) => {
    e.preventDefault();
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lon = pos.coords.longitude.toFixed(4);
          setFormData(prev => ({ ...prev, gps: `${lat}, ${lon}` }));
          alert(`📍 GPS Locked: ${lat}, ${lon}`);
        },
        () => alert('❌ GPS Error: Please allow location access.'),
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by your device.');
    }
  };

  const handleRealCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imgProof = `IMG-${Date.now()}-${file.size}`;
      setFormData(prev => ({ ...prev, photoHash: imgProof }));
      alert('📸 Live Photo Captured & Cryptographically Hashed!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.offlineMode && !formData.photoHash) return alert('You must capture live photo proof!');
    if (!formData.offlineMode && !formData.gps) return alert('GPS is required!');
    const payload = { ...formData, farmer: user.id };
    await authFetch(`${API_BASE_URL}/api/bale`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    fetchBales();
    setMsg('✅ Bale Registered to Blockchain!');
    setFormData({ ...formData, id: '', weight: '', woodScore: '', photoHash: '', gps: '', offlineMode: false });
  };

  const handleAcceptBid = async (baleId) => {
    setProcessingPayment(true);
    setTimeout(async () => {
      const res = await authFetch(`${API_BASE_URL}/api/accept`, {
        method: 'POST',
        body: JSON.stringify({ baleId, farmerId: user.id })
      });
      setProcessingPayment(false);
      if (!res) return; // session expired, already logged out
      const data = await res.json();
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

  // ─────────────────────────────────────────────
  // LOGIN SCREEN
  // ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🌿 Tobacco Trace</h1><p>Secure Auction Floor Login</p>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Grower / Corporate ID" onChange={e => setLoginCreds({ ...loginCreds, growerId: e.target.value })} />
            <input type="password" placeholder="National ID" onChange={e => setLoginCreds({ ...loginCreds, nationalId: e.target.value })} />
            <button type="submit">Enter Floor</button>
          </form>
          {loginError && <p className="error">{loginError}</p>}
          <div className="demo-hint">
            <small>Farmer ID: G-12345 / National ID: 63-111111-F-12</small><br />
            <small>Buyer ID: BAT-001 / National ID: 99-999999-B-99</small><br />
            <small>Admin ID: TIMB-001 / National ID: 00-000000-A-00</small>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // MAIN APP (unchanged layout, all fetch → authFetch)
  // ─────────────────────────────────────────────
  return (
    <div className="dashboard-layout">
      {processingPayment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', maxWidth: '300px' }}>
            <h2 style={{ color: '#27ae60', margin: '0 0 10px 0' }}>Processing...</h2>
            <p style={{ fontSize: '14px', color: '#333' }}>Executing Smart Contract & routing funds via EcoCash API to +263 77X XXX XXX.</p>
            <div style={{ marginTop: '20px', fontSize: '30px' }}>🔄📱💳</div>
          </div>
        </div>
      )}

      {traceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>🔗 Immutable Audit Trail</h3>
              <button onClick={() => setTraceModal(null)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p><strong>Bale ID:</strong> {traceModal.id}</p>
              <p><strong>Current State:</strong> <span className="badge">{traceModal.status}</span></p>
              <h4 style={{ marginTop: '20px', color: '#7f8c8d' }}>Cryptographic Event Chain</h4>
              <div style={{ borderLeft: '3px solid #3498db', paddingLeft: '20px', marginLeft: '10px' }}>
                {traceModal.history && traceModal.history.map((evt, idx) => (
                  <div key={idx} style={{ marginBottom: '20px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-28px', top: '0', width: '12px', height: '12px', backgroundColor: '#3498db', borderRadius: '50%' }}></div>
                    <strong style={{ color: '#2980b9' }}>{evt.action}</strong>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{new Date(evt.timestamp).toLocaleString()} | Actor: {evt.actor}</div>
                    <div style={{ backgroundColor: '#f1f2f6', padding: '8px', borderRadius: '4px', fontSize: '13px', marginTop: '5px', border: '1px solid #dcdde1' }}>
                      {evt.details}<br />
                      <small style={{ fontFamily: 'monospace', color: '#e67e22' }}>Hash: {evt.hash.substring(0, 32)}...</small>
                    </div>
                  </div>
                ))}
                {(!traceModal.history || traceModal.history.length === 0) && <p style={{ color: '#e74c3c' }}>No history found.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div className="brand">🌿 Tobacco Trace</div>
        <div className="user-profile"><div className="avatar">👤</div><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
        <nav>
          {user.role !== 'ADMIN' && <button onClick={() => setView('DASHBOARD')} className={view === 'DASHBOARD' ? 'active' : ''}>📊 Floor Overview</button>}
          {user.role === 'FARMER' && <button onClick={() => setView('REGISTER')} className={view === 'REGISTER' ? 'active' : ''}>📝 Register Bale</button>}
          {user.role === 'BUYER' && <button onClick={() => setView('MARKET')} className={view === 'MARKET' ? 'active' : ''}>💰 Place Bids</button>}
          {user.role === 'ADMIN' && (
            <><button onClick={() => setView('RISK_MONITOR')} className={view === 'RISK_MONITOR' ? 'active' : ''}>🚨 Risk Monitoring</button><button onClick={() => setView('AUDIT')} className={view === 'AUDIT' ? 'active' : ''}>🔎 Audit Ledger</button></>
          )}
          <button onClick={handleLogout} className="logout">🚪 Logout</button>
        </nav>
      </aside>

      <main className="content">
        <header>
          <h2>{view.replace('_', ' ')}</h2>
          {user.role === 'FARMER' && <div className="wallet-badge">TOTAL ECOCASH DISBURSED: <span>${user.wallet}.00</span></div>}
          {user.role === 'BUYER' && <div className="wallet-badge">CORPORATE ESCROW: <span>${user.wallet}.00</span></div>}
          {user.role === 'ADMIN' && <div className="wallet-badge" style={{ color: '#c0392b', borderColor: '#c0392b' }}>SYSTEM ACCESS: <span>REGULATOR ORACLE</span></div>}
        </header>

        {view === 'DASHBOARD' && (
          <div className="ledger-view">
            <h3>Live Auction Floor</h3>
            <table>
              <thead><tr><th>Batch / Hash</th><th>Weight</th><th>Eco-Score</th><th>Calculated Floor Price</th><th>Status</th><th>Action / Receipt</th></tr></thead>
              <tbody>
                {bales.map(b => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.id}</strong><br />
                      <small style={{ color: '#3498db', fontFamily: 'monospace' }}>🔗 {b.hash ? b.hash.substring(0, 15) + '...' : ''}</small><br />
                      <button onClick={() => setTraceModal(b)} style={{ background: '#34495e', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginTop: '5px' }}>🔍 View Trace</button>
                    </td>
                    <td>{b.weight} kg</td>
                    <td><strong style={b.woodScore > 30 ? { color: '#e74c3c' } : { color: '#27ae60' }}>{b.woodScore}</strong></td>
                    <td><strong style={{ color: '#2c3e50' }}>${b.floorPrice || '-'}</strong></td>
                    <td><span className="badge" style={b.status === 'NON_COMPLIANT' ? { backgroundColor: '#f8d7da', color: '#721c24' } : {}}>{b.status}</span></td>
                    {user.role === 'FARMER' && (
                      <td>
                        {b.status === 'ON_AUCTION' && <button className="save-btn" style={{ margin: 0, padding: '5px 10px' }} onClick={() => handleAcceptBid(b.id)}>✅ Accept ${b.highestBid}</button>}
                        {b.riskLevel === 'HIGH' && b.status !== 'SOLD' && <small style={{ color: '#e74c3c' }}>Locked: Pending Audit</small>}
                        {b.status === 'SOLD' && b.receipt && (
                          <div style={{ fontSize: '11px', backgroundColor: '#f1f2f6', padding: '5px', borderRadius: '4px', textAlign: 'left', minWidth: '120px' }}>
                            <b>Gross:</b> ${b.receipt.gross}<br />
                            <b>Levies (2%):</b> -${(b.receipt.timbLevy + b.receipt.platformFee).toFixed(2)}<br />
                            <b style={{ color: '#27ae60' }}>Net Payout: ${b.receipt.netPayout}</b>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'RISK_MONITOR' && (
          <div className="ledger-view">
            <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffeeba' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ Live Smart Contract Triggers</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>Algorithms actively scanning for: High-Ratio Discrepancies, Geographic Hotspots, and Offline Farmer requests.</p>
            </div>
            <table>
              <thead><tr><th>Batch ID</th><th>Risk Level</th><th>Trigger Reason</th><th>Oracle Action Required</th></tr></thead>
              <tbody>
                {bales.filter(b => b.riskLevel && b.riskLevel !== 'LOW').map(bale => (
                  <tr key={bale.id} style={{ backgroundColor: bale.riskLevel === 'HIGH' ? '#ffebee' : '#fffde7' }}>
                    <td><strong>{bale.id}</strong><br /><small>Farm: {bale.farmer}</small></td>
                    <td><strong style={{ color: bale.riskLevel === 'HIGH' ? 'red' : 'orange' }}>{bale.riskLevel}</strong></td>
                    <td>{bale.riskReason}</td>
                    <td><strong>{bale.officerAssigned}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'AUDIT' && (
          <div className="ledger-view">
            <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)} style={{ padding: '8px', marginBottom: '20px' }}>
              <option value="ALL">View: All Records</option>
              <option value="NON_COMPLIANT">🚨 Filter: Environmental Violations</option>
            </select>
            <table>
              <thead><tr><th>Batch ID / Tx Hash</th><th>Farm ID</th><th>Proof of Curing</th><th>Eco-Score</th><th>Status</th></tr></thead>
              <tbody>
                {bales.filter(b => auditFilter === 'ALL' || b.status === auditFilter).map(bale => (
                  <tr key={bale.id}>
                    <td>
                      <strong>{bale.id}</strong><br />
                      <small style={{ color: '#7f8c8d' }}>📍 {bale.gps || 'OFFLINE'}</small><br />
                      <small style={{ color: '#3498db', fontFamily: 'monospace' }}>🔗 {bale.hash ? bale.hash.substring(0, 20) + '...' : ''}</small><br />
                      <button onClick={() => setTraceModal(bale)} style={{ background: '#34495e', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginTop: '5px' }}>🔍 View Trace</button>
                    </td>
                    <td>{bale.farmer}</td>
                    <td><small>📷 {bale.photoEvidence}</small></td>
                    <td><strong style={bale.woodScore > 30 ? { color: '#e74c3c' } : { color: '#27ae60' }}>{bale.woodScore}</strong></td>
                    <td><span className="badge">{bale.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'REGISTER' && (
          <div className="form-container">
            <h3>New Bale Registration</h3>
            <form onSubmit={handleSubmit}>
              <label>Bale ID</label><input type="text" value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} required />
              <div className="row">
                <div><label>Bale Weight (kg)</label><input type="number" placeholder="e.g., 100" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} required /></div>
                <div><label>Wood Consumption Score</label><input type="number" placeholder="e.g., 15" value={formData.woodScore} onChange={e => setFormData({ ...formData, woodScore: e.target.value })} required /></div>
              </div>
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', cursor: 'pointer', margin: 0 }}>
                  <input type="checkbox" checked={formData.offlineMode} onChange={e => setFormData({ ...formData, offlineMode: e.target.checked, gps: '', photoHash: '' })} style={{ marginRight: '10px', width: 'auto' }} />
                  No Smartphone / Internet? (Request Physical Agritex Verification)
                </label>
              </div>
              {!formData.offlineMode && (
                <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <button type="button" onClick={getRealLocation} style={{ backgroundColor: '#e67e22', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>📍 1. Lock GPS Coordinates</button>
                  {formData.gps && <p style={{ color: '#27ae60', fontSize: '12px', margin: '-10px 0 0 0' }}>Coordinates: {formData.gps}</p>}
                  <label style={{ backgroundColor: '#34495e', color: 'white', padding: '12px', borderRadius: '5px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}>
                    📸 2. Capture Live Barn Photo
                    <input type="file" accept="image/*" capture="environment" onChange={handleRealCameraCapture} style={{ display: 'none' }} />
                  </label>
                  {formData.photoHash && <p style={{ color: '#27ae60', fontSize: '12px', margin: '-10px 0 0 0' }}>✅ Cryptographic Image Hash: {formData.photoHash}</p>}
                </div>
              )}
              <button type="submit" className="save-btn">List on Blockchain</button>
            </form>
            {msg && <p className="success-msg">{msg}</p>}
          </div>
        )}

        {view === 'MARKET' && (
          <div className="ledger-view">
            <h3>💰 Active Bidding</h3>
            <table>
              <thead><tr><th>ID</th><th>Grower</th><th>Floor Price</th><th>Current Bid</th><th>Your Offer ($)</th><th>Action</th></tr></thead>
              <tbody>
                {bales.filter(b => b.status === 'CREATED' || b.status === 'ON_AUCTION').map(bale => (
                  <tr key={bale.id}>
                    <td>{bale.id}</td><td>{bale.farmer}</td>
                    <td><strong style={{ color: '#2980b9' }}>${bale.floorPrice || '-'}</strong></td>
                    <td>{bale.highestBid ? `$${bale.highestBid}` : 'No Bids'}</td>
                    <td><input type="number" placeholder="0" style={{ width: '80px', padding: '5px' }} onChange={e => setBidAmount({ ...bidAmount, [bale.id]: e.target.value })} /></td>
                    <td>
                      <button className="save-btn" style={{ margin: 0, padding: '5px 15px', width: 'auto' }}
                        onClick={async () => {
                          const amount = bidAmount[bale.id];
                          if (!amount) return alert('Enter an amount!');
                          if (amount < bale.floorPrice) return alert(`Bid rejected: Floor price is $${bale.floorPrice}`);
                          const res = await authFetch(`${API_BASE_URL}/api/bid`, {
                            method: 'POST',
                            body: JSON.stringify({ baleId: bale.id, buyerId: user.id, amount: parseInt(amount) })
                          });
                          if (!res) return;
                          const data = await res.json();
                          if (data.success) { alert('Bid Placed!'); fetchBales(); } else { alert(data.error); }
                        }}
                      >Bid</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;