import React, { useState, useEffect } from 'react';

const VARIETIES = ['Virginia Flue-Cured', 'Burley', 'Oriental', 'Dark Fire-Cured'];
const CURING_METHODS = ['Solar/Air-Cured', 'Gas-Cured', 'Sustainable Wood', 'Dark Fire-Cured', 'Coal'];

// Compliance metadata shown live to the farmer
const CURING_INFO = {
  'Solar/Air-Cured':   { badge: '🌱 Fully Sustainable', color: '#27ae60', bg: '#eafaf1', note: '+$25 green bonus added to your floor price. Best environmental rating.',          penalty: false },
  'Gas-Cured':         { badge: '✅ Clean Method',       color: '#2980b9', bg: '#eaf4fb', note: '+$15 green bonus. Low-emission, TIMB compliant with no restrictions.',           penalty: false },
  'Sustainable Wood':  { badge: '⚠️ Conditional',        color: '#f39c12', bg: '#fef9e7', note: '+$20 green bonus if Wood Score ≤ 15. Non-compliant if Wood Score > 30.',         penalty: false },
  'Dark Fire-Cured':   { badge: '⚠️ Monitored',          color: '#e67e22', bg: '#fef5e7', note: '+$10 green bonus. Wood Score must stay ≤ 20 to avoid a MEDIUM risk flag.',      penalty: false },
  'Coal':              { badge: '🚫 High Emission',       color: '#e74c3c', bg: '#fdecea', note: '−$15 penalty applied to floor price. Flagged for Environmental Officer review.', penalty: true  },
};
const DESTINATIONS = [
  'Tobacco Sales Floor (TSF) – Harare',
  'Boka Tobacco Auctions – Harare',
  'Zimbabwe Leaf Tobacco (ZLT)',
  'Tribac Leaf Zimbabwe',
  'Contract Buyer – BAT Zimbabwe',
  'Contract Buyer – Philip Morris',
  'Other'
];
const INPUT_CHECKLIST = [
  { category: 'Fertilizers', items: ['Compound D', 'Compound L', 'Ammonium Nitrate', 'Tobacco Blend 6.10.28', 'Potassium Sulphate', 'Single Superphosphate', 'Urea'] },
  { category: 'Pesticides',  items: ['Aldicarb (Temik)', 'Chlorpyrifos', 'Imidacloprid', 'Lambda-cyhalothrin', 'Dimethoate'] },
  { category: 'Herbicides',  items: ['Metolachlor', 'Pendimethalin', 'Glyphosate (Roundup)', 'Acetochlor'] },
  { category: 'Fungicides',  items: ['Mancozeb', 'Metalaxyl', 'Chlorothalonil', 'Propiconazole'] },
];

export default function RegisterBaleForm({ user, apiBase, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    variety: 'Virginia Flue-Cured',
    numberOfBales: '',
    weight: '',
    estimatedValue: '',
    woodWeight: '',
    curing: 'Solar/Air-Cured',
    destination: DESTINATIONS[0],
    destinationOther: '',
    offlineMode: false,
    gps: '',
    photoHash: '',
  });

  // Auto-calculated — never typed by the farmer
  const computedWoodScore =
    parseFloat(form.woodWeight) > 0 && parseFloat(form.weight) > 0
      ? parseFloat(((parseFloat(form.woodWeight) / parseFloat(form.weight)) * 100).toFixed(1))
      : null;

  const [checkedInputs, setCheckedInputs] = useState([]);
  const [gpsStatus,     setGpsStatus]     = useState('loading'); // loading | locked | error
  const [photoStatus,   setPhotoStatus]   = useState('idle');   // idle | captured
  const [submitting,    setSubmitting]    = useState(false);
  const [result,        setResult]        = useState(null);
  const [errors,        setErrors]        = useState({});

  // ── helpers ──────────────────────────────────────────────────────
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const weightPerBale =
    form.numberOfBales > 0 && form.weight > 0
      ? (parseFloat(form.weight) / parseInt(form.numberOfBales)).toFixed(1)
      : null;

  const toggleInput = item =>
    setCheckedInputs(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );

  // Auto-lock GPS on form mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        set('gps', `${lat}, ${lon}`);
        setGpsStatus('locked');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true }
    );
  }, []);

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
    if (!form.numberOfBales || parseInt(form.numberOfBales) < 1) e.numberOfBales = 'Enter number of bales.';
    if (!form.weight || parseFloat(form.weight) <= 0)      e.weight       = 'Enter total weight.';
    // woodScore is auto-calculated — no manual validation needed    if (!form.offlineMode && !form.gps)                    e.gps          = 'GPS lock is required.';
    if (!form.offlineMode && !form.photoHash)              e.photoHash    = 'Photo evidence is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── submit ───────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);

    const payload = {
      farmer:         user.id,
      variety:        form.variety,
      numberOfBales:  parseInt(form.numberOfBales),
      weight:         parseFloat(form.weight),
      estimatedValue: parseFloat(form.estimatedValue) || 0,
      woodScore:      computedWoodScore ?? 0,
      woodWeight:     parseFloat(form.woodWeight) || 0,
      curing:         form.curing,
      destination:    form.destination,
      destinationOther: form.destinationOther,
      gps:            form.gps,
      offlineMode:    form.offlineMode,
      photoHash:      form.photoHash,
      inputs:         checkedInputs,
    };

    try {
      const res = await fetch(`${apiBase}/api/bale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, ...data });
        onSuccess();
        // reset
        setForm({
          id: '', variety: 'Virginia Flue-Cured', numberOfBales: '', weight: '',
          estimatedValue: '', woodScore: '', woodWeight: '', curing: 'Sustainable Wood',
          destination: DESTINATIONS[0], destinationOther: '', offlineMode: false,
          gps: '', photoHash: '',
        });
        setCheckedInputs([]);
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

  // ── style helpers ─────────────────────────────────────────────────
  const field = err => ({
    width: '100%', padding: '9px 12px', borderRadius: '6px', fontSize: '14px',
    border: `1px solid ${err ? '#e74c3c' : '#ccc'}`,
    boxSizing: 'border-box', marginTop: '4px', outline: 'none',
  });
  const lbl  = { display: 'block', fontWeight: '600', fontSize: '13px', color: '#555', marginTop: '14px' };
  const err  = { color: '#e74c3c', fontSize: '12px', marginTop: '3px' };
  const card = { backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' };
  const head = { margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: '#2c3e50',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '2px solid #3498db', paddingBottom: '8px',
    display: 'flex', alignItems: 'center', gap: '8px' };
  const riskColor = { HIGH: '#e74c3c', MEDIUM: '#f39c12', LOW: '#27ae60' };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px', borderBottom: '2px solid #f0f0f0', paddingBottom: '16px' }}>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '20px' }}>📝 New Bale Batch Registration</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>
            Fields marked <span style={{ color: '#e74c3c' }}>*</span> are required. &nbsp;|&nbsp;
            Date: <strong>{today}</strong> &nbsp;|&nbsp;
            Farmer ID: <strong style={{ color: '#3498db' }}>{user.id}</strong> &nbsp;|&nbsp;
            Name: <strong>{user.name}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Section 1: Batch Identity ── */}
          <div style={card}>
            <h3 style={head}><span>🏷️</span> Batch Identity</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>

              <div>
                <label style={lbl}>Tobacco Variety <span style={{ color: '#e74c3c' }}>*</span></label>
                <select style={field(false)} value={form.variety} onChange={e => set('variety', e.target.value)}>
                  {VARIETIES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Number of Bales <span style={{ color: '#e74c3c' }}>*</span></label>
                <input style={field(errors.numberOfBales)} type="number" min="1"
                  placeholder="e.g. 5" value={form.numberOfBales}
                  onChange={e => set('numberOfBales', e.target.value)} />
                {errors.numberOfBales && <p style={err}>{errors.numberOfBales}</p>}
              </div>

              <div>
                <label style={lbl}>Total Batch Weight (kg) <span style={{ color: '#e74c3c' }}>*</span></label>
                <input style={field(errors.weight)} type="number" min="0" step="0.1"
                  placeholder="e.g. 500" value={form.weight}
                  onChange={e => set('weight', e.target.value)} />
                {errors.weight && <p style={err}>{errors.weight}</p>}
                {weightPerBale && (
                  <p style={{ fontSize: '12px', color: '#27ae60', margin: '3px 0 0' }}>≈ {weightPerBale} kg / bale</p>
                )}
              </div>

            </div>

            <div style={{ marginTop: '4px' }}>
              <label style={lbl}>Your Estimated Total Value (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', marginTop: '2px' }}>$</span>
                <input style={{ ...field(false), paddingLeft: '26px' }} type="number" min="0" step="0.01"
                  placeholder="Your own valuation (optional)" value={form.estimatedValue}
                  onChange={e => set('estimatedValue', e.target.value)} />
              </div>
              <p style={{ fontSize: '12px', color: '#888', margin: '3px 0 0' }}>
                The <strong>algorithmic floor price</strong> is calculated by the system and may differ.
              </p>
            </div>
          </div>

          {/* ── Section 2: Curing & Wood ── */}
          <div style={card}>
            <h3 style={head}><span>🌿</span> Curing & Environmental Compliance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>

              <div>
                <label style={lbl}>Curing Method <span style={{ color: '#e74c3c' }}>*</span></label>
                <select style={field(false)} value={form.curing} onChange={e => set('curing', e.target.value)}>
                  {CURING_METHODS.map(c => <option key={c}>{c}</option>)}
                </select>
                {/* Live compliance badge */}
                {CURING_INFO[form.curing] && (() => {
                  const info = CURING_INFO[form.curing];
                  return (
                    <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '6px',
                      backgroundColor: info.bg, border: `1px solid ${info.color}` }}>
                      <span style={{ fontWeight: '700', color: info.color, fontSize: '13px' }}>
                        {info.badge}
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>{info.note}</p>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={lbl}>
                  Wood Consumption Score <span style={{ color: '#e74c3c' }}>*</span>
                  <span title="0–15: Green Bonus eligible. >30: Non-compliant."
                    style={{ marginLeft: '6px', cursor: 'help', color: '#3498db' }}>ℹ️</span>
                </label>
                <input style={field(errors.woodScore)} type="number" min="0"
                  placeholder="0 – 100" value={form.woodScore}
                  onChange={e => set('woodScore', e.target.value)} />
                {errors.woodScore && <p style={err}>{errors.woodScore}</p>}
                {form.woodScore !== '' && (
                  <p style={{ fontSize: '12px', margin: '3px 0 0',
                    color: parseInt(form.woodScore) <= 15 ? '#27ae60'
                         : parseInt(form.woodScore) > 30 ? '#e74c3c' : '#f39c12' }}>
                    {parseInt(form.woodScore) <= 15 ? '✅ +$20 Green Bonus eligible'
                      : parseInt(form.woodScore) > 30 ? '🚫 Non-compliant threshold'
                      : '⚠️ Above green threshold'}
                  </p>
                )}
              </div>

              <div>
                <label style={lbl}>Wood Weight Used (kg)</label>
                <input style={field(false)} type="number" min="0" step="0.1"
                  placeholder="e.g. 200" value={form.woodWeight}
                  onChange={e => set('woodWeight', e.target.value)} />
              </div>

            </div>
          </div>

          {/* ── Section 3: Inputs Checklist ── */}
          <div style={card}>
            <h3 style={head}><span>🧪</span> Inputs Declared (Fertilizers & Pesticides)</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#888' }}>
              Tick all products applied to this batch. Recorded for TIMB audit purposes only.
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
          <div style={card}>
            <h3 style={head}><span>🏛️</span> Auction Destination</h3>
            <label style={lbl}>Auction Floor / Contractor <span style={{ color: '#e74c3c' }}>*</span></label>
            <select style={field(false)} value={form.destination} onChange={e => set('destination', e.target.value)}>
              {DESTINATIONS.map(d => <option key={d}>{d}</option>)}
            </select>
            {form.destination === 'Other' && (
              <input style={{ ...field(false), marginTop: '10px' }}
                placeholder="Specify auction floor or contractor name"
                value={form.destinationOther}
                onChange={e => set('destinationOther', e.target.value)} />
            )}
          </div>

          {/* ── Section 5: Proof of Origin ── */}
          <div style={card}>
            <h3 style={head}><span>📍</span> Proof of Origin</h3>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#555' }}>
              <input type="checkbox" checked={form.offlineMode}
                onChange={e => {
                  set('offlineMode', e.target.checked);
                  set('gps', ''); set('photoHash', '');
                  setGpsStatus(e.target.checked ? 'idle' : 'loading');
                  if (!e.target.checked) {
                    // Re-acquire GPS when coming back online
                    navigator.geolocation.getCurrentPosition(
                      pos => { set('gps', `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setGpsStatus('locked'); },
                      () => setGpsStatus('error'),
                      { enableHighAccuracy: true }
                    );
                  }
                }}
                style={{ width: '16px', height: '16px' }} />
              No smartphone / internet? (Request physical Agritex verification — MEDIUM risk)
            </label>

            {!form.offlineMode && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* GPS — auto-locked, read only */}
                <div style={{
                  padding: '11px 14px', borderRadius: '7px', fontSize: '14px', fontWeight: '600',
                  backgroundColor: gpsStatus === 'locked' ? '#eafaf1' : gpsStatus === 'error' ? '#fdecea' : '#fef9e7',
                  border: `1px solid ${gpsStatus === 'locked' ? '#27ae60' : gpsStatus === 'error' ? '#e74c3c' : '#f39c12'}`,
                  color: gpsStatus === 'locked' ? '#1e8449' : gpsStatus === 'error' ? '#c0392b' : '#856404',
                }}>
                  {gpsStatus === 'loading' && '⏳ Acquiring GPS lock...'}
                  {gpsStatus === 'locked'  && `✅ GPS Locked: ${form.gps}`}
                  {gpsStatus === 'error'   && '❌ GPS unavailable — please allow location access and reload.'}
                </div>
                {errors.gps && <p style={err}>{errors.gps}</p>}

                <div>
                  <label style={{
                    display: 'block', width: '100%', boxSizing: 'border-box',
                    padding: '11px', textAlign: 'center', fontWeight: '600', fontSize: '14px',
                    backgroundColor: photoStatus === 'captured' ? '#27ae60' : '#34495e',
                    color: 'white', borderRadius: '7px', cursor: 'pointer',
                  }}>
                    {photoStatus === 'idle' ? '📸 2. Capture Live Barn Photo' : `✅ Photo Hashed: ${form.photoHash}`}
                    <input type="file" accept="image/*" capture="environment"
                      onChange={capturePhoto} style={{ display: 'none' }} />
                  </label>
                  {errors.photoHash && <p style={err}>{errors.photoHash}</p>}
                </div>

              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <button type="submit" disabled={submitting}
            style={{ width: '100%', padding: '14px',
              backgroundColor: submitting ? '#95a5a6' : '#2c3e50',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '0.5px' }}>
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
                <p style={{ margin: '0 0 10px', fontWeight: '700', color: '#1e8449', fontSize: '15px' }}>
                  ✅ Batch registered successfully.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  {[
                    { label: 'ALGORITHMIC FLOOR PRICE', value: `$${result.floorPrice}` },
                    { label: 'RISK LEVEL', value: result.riskLevel, color: riskColor[result.riskLevel] },
                    { label: 'BATCH ID', value: result.baleId, mono: true },
                  ].map(({ label, value, color, mono }) => (
                    <div key={label} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #d5f5e3', textAlign: 'center' }}>
                      <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: color || '#2c3e50', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                    </div>
                  ))}
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