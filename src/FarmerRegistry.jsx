import React, { useState, useEffect } from 'react';

const REGIONS = [
  'Harare', 'Bulawayo', 'Manicaland',
  'Mashonaland Central', 'Mashonaland East', 'Mashonaland West',
  'Masvingo', 'Matabeleland North', 'Matabeleland South', 'Midlands',
];

const REGION_CODES = {
  'Harare': 'HRE', 'Bulawayo': 'BYO', 'Manicaland': 'MAN',
  'Mashonaland Central': 'MSC', 'Mashonaland East': 'MSE',
  'Mashonaland West': 'MSW', 'Masvingo': 'MVG',
  'Matabeleland North': 'MTN', 'Matabeleland South': 'MTS',
  'Midlands': 'MID',
};

const empty = { name: '', nationalId: '', phone: '', region: 'Harare' };

export default function FarmerRegistry({ apiBase }) {
  const [farmers,    setFarmers]    = useState([]);
  const [form,       setForm]       = useState(empty);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [search,     setSearch]     = useState('');
  const [filterRegion, setFilterRegion] = useState('ALL');

  useEffect(() => { fetchFarmers(); }, []);

  const fetchFarmers = async () => {
    try {
      const res = await fetch(`${apiBase}/api/farmers`);
      setFarmers(await res.json());
    } catch (e) { console.error(e); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())       e.name       = 'Full name is required.';
    if (!form.nationalId.trim()) e.nationalId = 'National ID is required.';
    if (!form.phone.trim())      e.phone      = 'Phone number is required.';
    if (!form.region)            e.region     = 'Region is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async ev => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res  = await fetch(`${apiBase}/api/farmers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, growerId: data.growerId, name: form.name });
        setForm(empty);
        fetchFarmers();
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch {
      setResult({ success: false, message: 'Server error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── filtered list ────────────────────────────────────────────────
  const visible = farmers.filter(f => {
    const matchSearch = search === '' ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase()) ||
      (f.phone || '').includes(search);
    const matchRegion = filterRegion === 'ALL' || f.region === filterRegion;
    return matchSearch && matchRegion;
  });

  // ── styles ───────────────────────────────────────────────────────
  const card  = { backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '20px 24px', marginBottom: '24px' };
  const head  = { margin: '0 0 16px', fontSize: '14px', fontWeight: '700', color: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #3498db', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' };
  const lbl   = { display: 'block', fontWeight: '600', fontSize: '13px', color: '#555', marginTop: '12px' };
  const field = hasErr => ({ width: '100%', padding: '9px 12px', borderRadius: '6px', fontSize: '14px', border: `1px solid ${hasErr ? '#e74c3c' : '#ccc'}`, boxSizing: 'border-box', marginTop: '4px', outline: 'none' });
  const errTxt = { color: '#e74c3c', fontSize: '12px', marginTop: '3px' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* ── Stats Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Farmers',  value: farmers.length,                                           color: '#3498db' },
          { label: 'Active',         value: farmers.filter(f => f.status === 'ACTIVE').length,        color: '#27ae60' },
          { label: 'Regions Covered',value: [...new Set(farmers.map(f => f.region))].length,          color: '#9b59b6' },
          { label: 'Total Bales',    value: farmers.reduce((s, f) => s + (f.baleCount || 0), 0),      color: '#e67e22' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderTop: `3px solid ${color}`, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Register New Farmer Form ── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '28px' }}>
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '14px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>➕ Register New Farmer</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>
            Grower ID is auto-generated based on region. Farmer logs in with their Grower ID + National ID.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>

            <div>
              <label style={lbl}>Full Name <span style={{ color: '#e74c3c' }}>*</span></label>
              <input style={field(errors.name)} placeholder="e.g. Tinashe Moyo"
                value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <p style={errTxt}>{errors.name}</p>}
            </div>

            <div>
              <label style={lbl}>National ID <span style={{ color: '#e74c3c' }}>*</span></label>
              <input style={field(errors.nationalId)} placeholder="e.g. 63-111111-F-12"
                value={form.nationalId} onChange={e => set('nationalId', e.target.value)} />
              {errors.nationalId && <p style={errTxt}>{errors.nationalId}</p>}
              <p style={{ fontSize: '11px', color: '#aaa', margin: '3px 0 0' }}>Used as login password — keep confidential.</p>
            </div>

            <div>
              <label style={lbl}>Phone Number <span style={{ color: '#e74c3c' }}>*</span></label>
              <input style={field(errors.phone)} placeholder="e.g. +263771234567"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
              {errors.phone && <p style={errTxt}>{errors.phone}</p>}
            </div>

            <div>
              <label style={lbl}>Province / Region <span style={{ color: '#e74c3c' }}>*</span></label>
              <select style={field(errors.region)} value={form.region} onChange={e => set('region', e.target.value)}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
              {errors.region && <p style={errTxt}>{errors.region}</p>}
              {form.region && (
                <p style={{ fontSize: '12px', color: '#3498db', margin: '4px 0 0', fontWeight: '600' }}>
                  Generated ID preview: TT-{REGION_CODES[form.region]}-###
                </p>
              )}
            </div>

          </div>

          <button type="submit" disabled={submitting}
            style={{ marginTop: '20px', padding: '12px 28px',
              backgroundColor: submitting ? '#95a5a6' : '#2c3e50',
              color: 'white', border: 'none', borderRadius: '7px',
              fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '⏳ Registering...' : '✅ Register Farmer & Generate ID'}
          </button>
        </form>

        {/* Result banner */}
        {result && (
          <div style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '8px',
            backgroundColor: result.success ? '#eafaf1' : '#fdecea',
            border: `1px solid ${result.success ? '#27ae60' : '#e74c3c'}` }}>
            {result.success ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '700', color: '#1e8449' }}>
                    ✅ {result.name} registered successfully.
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
                    Grower ID assigned: &nbsp;
                    <strong style={{ fontFamily: 'monospace', fontSize: '16px', color: '#2c3e50', backgroundColor: '#d5f5e3', padding: '2px 8px', borderRadius: '4px' }}>
                      {result.growerId}
                    </strong>
                    &nbsp; — share this with the farmer for login.
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontWeight: '600', color: '#c0392b' }}>🛑 {result.message}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Farmer Directory ── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ ...card, backgroundColor: 'transparent', border: 'none', padding: 0, marginBottom: '16px' }}>
          <h3 style={{ ...head, borderBottom: '2px solid #3498db', paddingBottom: '8px' }}>
            <span>👥</span> Farmer Directory ({visible.length} of {farmers.length})
          </h3>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            placeholder="🔍 Search by name, ID or phone..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', outline: 'none' }}
          />
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', outline: 'none' }}>
            <option value="ALL">All Regions</option>
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                {['Grower ID', 'Full Name', 'Phone', 'Region', 'Registered', 'Bales', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#555', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontStyle: 'italic' }}>No farmers found.</td></tr>
              ) : visible.map((f, i) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#2980b9', backgroundColor: '#eaf4fb', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {f.id}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#2c3e50' }}>{f.name}</td>
                  <td style={{ padding: '10px 12px', color: '#555' }}>{f.phone || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ backgroundColor: '#eaf4fb', color: '#2980b9', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                      {f.region || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#888', fontSize: '12px' }}>
                    {f.registeredAt ? new Date(f.registeredAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: '700', color: f.baleCount > 0 ? '#27ae60' : '#aaa' }}>
                      {f.baleCount || 0}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                      backgroundColor: f.status === 'ACTIVE' ? '#eafaf1' : '#fdecea',
                      color: f.status === 'ACTIVE' ? '#27ae60' : '#e74c3c',
                    }}>
                      {f.status || 'ACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}