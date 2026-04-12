import React, { useState } from 'react';

const VARIETIES = ['Virginia Flue-Cured', 'Burley', 'Oriental', 'Dark Fire-Cured'];
const CURING_METHODS = ['Sustainable Wood', 'Coal', 'Solar/Air-Cured', 'Gas-Cured'];
const DESTINATIONS = [
  'Tobacco Sales Floor (TSF) – Harare',
  'Boka Tobacco Auctions – Harare',
  'Zimbabwe Leaf Tobacco (ZLT)',
  'Tribac Leaf Zimbabwe',
  'Contract Buyer – BAT Zimbabwe',
  'Contract Buyer – Philip Morris',
  'Other'
];
// Common inputs as a flat checklist grouped by category
const INPUT_CHECKLIST = [
  { category: 'Fertilizers',  items: ['Compound D', 'Compound L', 'Ammonium Nitrate', 'Tobacco Blend 6.10.28', 'Potassium Sulphate', 'Single Superphosphate', 'Urea'] },
  { category: 'Pesticides',   items: ['Aldicarb (Temik)', 'Chlorpyrifos', 'Imidacloprid', 'Lambda-cyhalothrin', 'Dimethoate'] },
  { category: 'Herbicides',   items: ['Metolachlor', 'Pendimethalin', 'Glyphosate (Roundup)', 'Acetochlor'] },
  { category: 'Fungicides',   items: ['Mancozeb', 'Metalaxyl', 'Chlorothalonil', 'Propiconazole'] },
];

export default function RegisterBaleForm({ user, authFetch, apiBase, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    id: '',
    variety: 'Virginia Flue-Cured',
    numberOfBales: '',
    weight: '',
    estimatedValue: '',
    woodScore: '',
    woodWeight: '',
    curing: 'Sustainable Wood',
    destination: DESTINATIONS[0],
    destinationOther: '',
    offlineMode: false,
    gps: '',
    photoHash: '',
  });

  const [checkedInputs, setCheckedInputs] = useState([]); // selected checklist items
  const [gpsStatus, setGpsStatus]   = useState('idle'); // idle | loading | locked
  const [photoStatus, setPhotoStatus] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]   = useState(null); // { success, message, riskLevel, floorPrice }
  const [errors, setErrors]   = useState({});

  // ── field helpers ───────────────────────────────────────────────
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const weightPerBale = form.numberOfBales > 0 && form.weight > 0
    ? (parseFloat(form.weight) / parseInt(form.numberOfBales)).toFixed(1)
    : null;

  // ── checklist toggle ─────────────────────────────────────────────
  const toggleInput = item => setCheckedInputs(prev =>
    prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
  );

  // ── hardware capture ─────────────────────────────────────────────
  const lockGPS = () => {
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        set('gps', `${lat}, ${lon}`);
        setGpsStatus('locked');
      },
      () => { setGpsStatus('idle'); alert('❌ GPS Error: Please allow location access.'); },
      { enableHighAccuracy: true }
    );
  };

  const capturePhoto = e => {
    const file = e.target.files[0];
    if (file) {
      set('photoHash', `IMG-${Date.now()}-${file.size}`);
      setPhotoStatus('captured');
    }
  };

  // ── validation ───────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.id.trim())           e.id = 'Batch ID is required.';
    if (!form.numberOfBales || parseInt(form.numberOfBales) < 1)
                                   e.numberOfBales = 'Enter number of bales.';
    if (!form.weight || parseFloat(form.weight) <= 0)
                                   e.weight = 'Enter total weight.';
    if (form.woodScore === '')     e.woodScore = 'Wood score is required.';
    if (!form.offlineMode && !form.gps)
                                   e.gps = 'GPS lock required.';
    if (!form.offlineMode && !form.photoHash)
                                   e.photoHash = 'Photo evidence required.';
    inputs.forEach((inp, i) => {
      if (!inp.name.trim())        e[`inp_name_${i}`] = 'Input name required.';
      if (!inp.amount || parseFloat(inp.amount) <= 0)
                                   e[`inp_amt_${i}`] = 'Valid amount required.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── submit ───────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);

    const finalDest = form.destination === 'Other' ? form.destinationOther : form.destination;

    const payload = {
      id: form.id.trim(),
      farmer: user.id,
      variety: form.variety,
      numberOfBales: parseInt(form.numberOfBales),
      weight: parseFloat(form.weight),
      estimatedValue: parseFloat(form.estimatedValue) || 0,
      woodScore: parseInt(form.woodScore),
      woodWeight: parseFloat(form.woodWeight) || 0,
      curing: form.curing,
      destination: form.destination,
      destinationOther: form.destinationOther,
      gps: form.gps,
      offlineMode: form.offlineMode,
      photoHash: form.photoHash,
      inputs
    };

    try {
      const res = await authFetch(`${apiBase}/api/bale`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res) return; // session expired
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, ...data });
        onSuccess();
        // Reset form
        setForm({ id: '', variety: 'Virginia Flue-Cured', numberOfBales: '', weight: '',
          estimatedValue: '', woodScore: '', woodWeight: '', curing: 'Sustainable Wood',
          destination: DESTINATIONS[0], destinationOther: '', offlineMode: false, gps: '', photoHash: '' });
        setInputs([]);
        setGpsStatus('idle');
        setPhotoStatus('idle');
      } else {
        setResult({ success: false, message: data.error || 'Registration failed.' });
      }
    } catch {
      setResult({ success: false, message: '❌ Server error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── style helpers ────────────────────────────────────────────────
  const fieldStyle = hasErr => ({
    width: '100%', padding: '9px 12px', borderRadius: '6px', fontSize: '14px',
    border: `1px solid ${hasErr ? '#e74c3c' : '#ccc'}`,
    boxSizing: 'border-box', marginTop: '4px', outline: 'none'
  });
  const labelStyle = { display: 'block', fontWeight: '600', fontSize: '13px', color: '#555', marginTop: '14px' };
  const errStyle   = { color: '#e74c3c', fontSize: '12px', marginTop: '3px' };
  const sectionStyle = {
    backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0',
    borderRadius: '10px', padding: '18px 20px', marginBottom: '20px'
  };
  const sectionTitle = { margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700',
    color: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '2px solid #3498db', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' };

  const riskColour = { HIGH: '#e74c3c', MEDIUM: '#f39c12', LOW: '#27ae60' };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '24px', borderBottom: '2px solid #f0f0f0', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>📝 New Bale Batch Registration</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>
            All fields marked <span style={{ color: '#e74c3c' }}>*</span> are required.
            Registration date: <strong>{today}</strong> &nbsp;|&nbsp;
            Farmer ID: <strong style={{ color: '#3498db' }}>{user.id}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Section 1: Batch Identity ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}><span>🏷️</span> Batch Identity</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div>
                <label style={labelStyle}>Batch / Bale ID <span style={{ color: '#e74c3c' }}>*</span></label>
                <input style={fieldStyle(errors.id)} value={form.id}
                  placeholder="e.g. TT-2025-001"
                  onChange={e => set('id', e.target.value)} />
                {errors.id && <p style={errStyle}>{errors.id}</p>}
              </div>
              <div>
                <label style={labelStyle}>Tobacco Variety <span style={{ color: '#e74c3c' }}>*</span></label>
                <select style={fieldStyle(false)} value={form.variety} onChange={e => set('variety', e.target.value)}>
                  {VARIETIES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Number of Bales <span style={{ color: '#e74c3c' }}>*</span></label>
                <input style={fieldStyle(errors.numberOfBales)} type="number" min="1"
                  placeholder="e.g. 5" value={form.numberOfBales}
                  onChange={e => set('numberOfBales', e.target.value)} />
                {errors.numberOfBales && <p style={errStyle}>{errors.numberOfBales}</p>}
              </div>
              <div>
                <label style={labelStyle}>Total Batch Weight (kg) <span style={{ color: '#e74c3c' }}>*</span></label>
                <input style={fieldStyle(errors.weight)} type="number" min="0" step="0.1"
                  placeholder="e.g. 500" value={form.weight}
                  onChange={e => set('weight', e.target.value)} />
                {errors.weight && <p style={errStyle}>{errors.weight}</p>}
                {weightPerBale && (
                  <p style={{ fontSize: '12px', color: '#27ae60', margin: '3px 0 0' }}>
                    ≈ {weightPerBale} kg / bale
                  </p>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Your Estimated Total Value (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', marginTop: '2px' }}>$</span>
                <input style={{ ...fieldStyle(false), paddingLeft: '26px' }} type="number" min="0" step="0.01"
                  placeholder="Your own valuation (optional)" value={form.estimatedValue}
                  onChange={e => set('estimatedValue', e.target.value)} />
              </div>
              <p style={{ fontSize: '12px', color: '#888', margin: '3px 0 0' }}>
                The <strong>algorithmic floor price</strong> will be calculated by the system and may differ.
              </p>
            </div>
          </div>

          {/* ── Section 2: Curing & Wood ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}><span>🌿</span> Curing & Environmental Compliance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
              <div>
                <label style={labelStyle}>Curing Method <span style={{ color: '#e74c3c' }}>*</span></label>
                <select style={fieldStyle(false)} value={form.curing} onChange={e => set('curing', e.target.value)}>
                  {CURING_METHODS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Wood Consumption Score <span style={{ color: '#e74c3c' }}>*</span>
                  <span title="0–15: Green Bonus eligible. >30: Non-compliant." style={{ marginLeft: '6px', cursor: 'help', color: '#3498db' }}>ℹ️</span>
                </label>
                <input style={fieldStyle(errors.woodScore)} type="number" min="0"
                  placeholder="0 – 100" value={form.woodScore}
                  onChange={e => set('woodScore', e.target.value)} />
                {errors.woodScore && <p style={errStyle}>{errors.woodScore}</p>}
                {form.woodScore !== '' && (
                  <p style={{ fontSize: '12px', margin: '3px 0 0',
                    color: parseInt(form.woodScore) <= 15 ? '#27ae60' : parseInt(form.woodScore) > 30 ? '#e74c3c' : '#f39c12' }}>
                    {parseInt(form.woodScore) <= 15 ? '✅ +$20 Green Bonus eligible'
                      : parseInt(form.woodScore) > 30 ? '🚫 Non-compliant threshold'
                      : '⚠️ Above green threshold'}
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Wood Weight Used (kg)</label>
                <input style={fieldStyle(false)} type="number" min="0" step="0.1"
                  placeholder="e.g. 200" value={form.woodWeight}
                  onChange={e => set('woodWeight', e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Section 3: Inputs Checklist ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}><span>🧪</span> Inputs Declared (Fertilizers & Pesticides)</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#888' }}>
              Tick all products applied to this batch. This is recorded for TIMB audit purposes only.
            </p>
            {INPUT_CHECKLIST.map(group => (
              <div key={group.category} style={{ marginBottom: '14px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700',
                  color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {group.category}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {group.items.map(item => {
                    const checked = checkedInputs.includes(item);
                    return (
                      <label key={item} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                        fontSize: '13px', userSelect: 'none', transition: 'all 0.15s',
                        backgroundColor: checked ? '#2c3e50' : '#f0f0f0',
                        color: checked ? '#fff' : '#555',
                        border: `1px solid ${checked ? '#2c3e50' : '#ddd'}`,
                      }}>
                        <input type="checkbox" checked={checked}
                          onChange={() => toggleInput(item)}
                          style={{ display: 'none' }} />
                        {checked ? '✓ ' : ''}{item}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {checkedInputs.length > 0 && (
              <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#27ae60' }}>
                {checkedInputs.length} input(s) selected: {checkedInputs.join(', ')}
              </p>
            )}
          </div>

          {/* ── Section 4: Destination ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}><span>🏛️</span> Auction Destination</h3>
            <label style={labelStyle}>Auction Floor / Contractor <span style={{ color: '#e74c3c' }}>*</span></label>
            <select style={fieldStyle(false)} value={form.destination} onChange={e => set('destination', e.target.value)}>
              {DESTINATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
            {form.destination === 'Other' && (
              <input style={{ ...fieldStyle(false), marginTop: '10px' }}
                placeholder="Specify auction floor or contractor name"
                value={form.destinationOther}
                onChange={e => set('destinationOther', e.target.value)} />
            )}
          </div>

          {/* ── Section 5: Proof of Origin ── */}
          <div style={sectionStyle}>
            <h3 style={sectionTitle}><span>📍</span> Proof of Origin</h3>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#555' }}>
              <input type="checkbox" checked={form.offlineMode}
                onChange={e => { set('offlineMode', e.target.checked); set('gps', ''); set('photoHash', ''); setGpsStatus('idle'); setPhotoStatus('idle'); }}
                style={{ width: '16px', height: '16px' }} />
              No smartphone / internet access? (Request physical Agritex verification — MEDIUM risk)
            </label>

            {!form.offlineMode && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* GPS */}
                <div>
                  <button type="button" onClick={lockGPS} disabled={gpsStatus === 'loading'}
                    style={{ width: '100%', padding: '11px', backgroundColor: gpsStatus === 'locked' ? '#27ae60' : '#e67e22',
                      color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer',
                      fontWeight: '600', fontSize: '14px' }}>
                    {gpsStatus === 'idle'    ? '📍 1. Lock GPS Coordinates'
                      : gpsStatus === 'loading' ? '⏳ Acquiring GPS Lock...'
                      : `✅ GPS Locked: ${form.gps}`}
                  </button>
                  {errors.gps && <p style={errStyle}>{errors.gps}</p>}
                </div>

                {/* Photo */}
                <div>
                  <label style={{ display: 'block', width: '100%', boxSizing: 'border-box',
                    padding: '11px', backgroundColor: photoStatus === 'captured' ? '#27ae60' : '#34495e',
                    color: 'white', borderRadius: '7px', cursor: 'pointer', fontWeight: '600',
                    fontSize: '14px', textAlign: 'center' }}>
                    {photoStatus === 'idle' ? '📸 2. Capture Live Barn Photo' : `✅ Photo Hashed: ${form.photoHash}`}
                    <input type="file" accept="image/*" capture="environment" onChange={capturePhoto} style={{ display: 'none' }} />
                  </label>
                  {errors.photoHash && <p style={errStyle}>{errors.photoHash}</p>}
                </div>
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <button type="submit" disabled={submitting}
            style={{ width: '100%', padding: '14px', backgroundColor: submitting ? '#95a5a6' : '#2c3e50',
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px',
              fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '0.5px' }}>
            {submitting ? '⏳ Registering to Blockchain...' : '🔗 Register Batch on Blockchain'}
          </button>
        </form>

        {/* ── Result Banner ── */}
        {result && (
          <div style={{ marginTop: '20px', padding: '16px 20px', borderRadius: '8px',
            backgroundColor: result.success ? '#eafaf1' : '#fdecea',
            border: `1px solid ${result.success ? '#27ae60' : '#e74c3c'}` }}>
            {result.success ? (
              <>
                <p style={{ margin: '0 0 8px', fontWeight: '700', color: '#1e8449', fontSize: '15px' }}>
                  ✅ Batch registered successfully.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #d5f5e3', textAlign: 'center' }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>ALGORITHMIC FLOOR PRICE</div>
                    <div style={{ fontWeight: '700', fontSize: '18px', color: '#2c3e50' }}>${result.floorPrice}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #d5f5e3', textAlign: 'center' }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>RISK LEVEL</div>
                    <div style={{ fontWeight: '700', fontSize: '18px', color: riskColour[result.riskLevel] || '#333' }}>{result.riskLevel}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #d5f5e3', textAlign: 'center' }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>BATCH ID</div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#2c3e50', fontFamily: 'monospace' }}>{result.baleId}</div>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontWeight: '600', color: '#c0392b' }}>🛑 {result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}