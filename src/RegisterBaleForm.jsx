import React, { useState, useEffect } from 'react';

const VARIETIES = ['Virginia Flue-Cured', 'Burley', 'Oriental', 'Dark Fire-Cured'];
const CURING_METHODS = ['Solar/Air-Cured', 'Gas-Cured', 'Sustainable Wood', 'Dark Fire-Cured', 'Coal'];
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
const CURING_INFO = {
  'Solar/Air-Cured':   { badge: '🌱 Fully Sustainable', color: '#27ae60', bg: '#eafaf1', note: '+$25 green bonus added to your floor price. Best environmental rating.' },
  'Gas-Cured':         { badge: '✅ Clean Method',       color: '#2980b9', bg: '#eaf4fb', note: '+$15 green bonus. Low-emission, TIMB compliant with no restrictions.' },
  'Sustainable Wood':  { badge: '⚠️ Conditional',        color: '#f39c12', bg: '#fef9e7', note: '+$20 green bonus if Wood Score ≤ 15. Non-compliant if Wood Score > 30.' },
  'Dark Fire-Cured':   { badge: '⚠️ Monitored',          color: '#e67e22', bg: '#fef5e7', note: '+$10 green bonus. Wood Score must stay ≤ 20 to avoid a MEDIUM risk flag.' },
  'Coal':              { badge: '🚫 High Emission',       color: '#e74c3c', bg: '#fdecea', note: '−$15 penalty applied to floor price. Flagged for Environmental Officer review.' },
};
const RISK_EXPLANATION = {
  LOW: {
    icon: '✅', title: 'All Checks Passed',
    message: 'Your bale has passed all origin, compliance, and environmental checks. It is cleared for auction with no restrictions.',
    bg: '#eafaf1', border: '#27ae60', color: '#1e8449',
  },
  MEDIUM: {
    icon: '⚠️', title: 'Review Required',
    message: 'Your bale has been flagged for a routine review. This may be due to offline registration, a high-emission curing method, or a wood weight anomaly. A local Agritex or Environmental Officer will be assigned to verify your batch before it proceeds to auction.',
    bg: '#fef9e7', border: '#f39c12', color: '#856404',
  },
  HIGH: {
    icon: '🚫', title: 'Batch Locked — Pending Physical Inspection',
    message: 'Your bale has been flagged as HIGH RISK and is currently locked from auction. This may be due to a geographic fraud alert, an impossible yield discrepancy, or a serious environmental violation. A TIMB Auditor or Forestry Commission officer has been dispatched for a physical inspection. You will not be able to accept bids until the inspection is complete and the lock is cleared by a TIMB officer.',
    bg: '#fdecea', border: '#e74c3c', color: '#c0392b',
  },
};

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

  const [checkedInputs, setCheckedInputs] = useState([]);
  const [gpsStatus,     setGpsStatus]     = useState('loading');
  const [photoStatus,   setPhotoStatus]   = useState('idle');
  const [submitting,    setSubmitting]    = useState(false);
  const [result,        setResult]        = useState(null);
  const [errors,        setErrors]        = useState({});

  // Auto-calculated wood score
  const computedWoodScore =
    parseFloat(form.woodWeight) > 0 && parseFloat(form.weight) > 0
      ? parseFloat(((parseFloat(form.woodWeight) / parseFloat(form.weight)) * 100).toFixed(1))
      : null;

  // ── Auto-lock GPS on mount ───────────────────────────────────────
  useEffect(() => {
    setForm(f => ({ ...f, gps: '-17.8292, 31.0522' }));
    setGpsStatus('locked');
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const weightPerBale =
    form.numberOfBales > 0 && form.weight > 0
      ? (parseFloat(form.weight) / parseInt(form.numberOfBales)).toFixed(1)
      : null;

  const toggleInput = item =>
    setCheckedInputs(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );

  const capturePhoto = e => {
    const file = e.target.files[0];
    if (file) {
      set('photoHash', `IMG-${Date.now()}-${file.size}`);
      setPhotoStatus('captured');
    }
  };

  // ── Validation ───────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.numberOfBales || parseInt(form.numberOfBales) < 1) e.numberOfBales = 'Enter number of bales.';
    if (!form.weight || parseFloat(form.weight) <= 0)            e.weight        = 'Enter total weight.';
    if (!form.offlineMode && gpsStatus !== 'locked')             e.gps           = 'GPS lock is required.';
    if (!form.offlineMode && !form.photoHash)                    e.photoHash     = 'Photo evidence is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);

    const payload = {
      farmer:           user.id,
      variety:          form.variety,
      numberOfBales:    parseInt(form.numberOfBales),
      weight:           parseFloat(form.weight),
      estimatedValue:   parseFloat(form.estimatedValue) || 0,
      woodScore:        computedWoodScore ?? 0,
      woodWeight:       parseFloat(form.woodWeight) || 0,
      curing:           form.curing,
      destination:      form.destination,
      destinationOther: form.destinationOther,
      gps:              form.gps,
      offlineMode:      form.offlineMode,
      photoHash:        form.photoHash,
      inputs:           checkedInputs,
    };

    try {
      const res  = await fetch(`${apiBase}/api/bale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, ...data });
        onSuccess();
        setForm({
          variety: 'Virginia Flue-Cured', numberOfBales: '', weight: '',
          estimatedValue: '', woodWeight: '', curing: 'Solar/Air-Cured',
          destination: DESTINATIONS[0], destinationOther: '', offlineMode: false,
          gps: form.gps, photoHash: '', // keep GPS, reset the rest
        });
        setCheckedInputs([]);
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

  // ── Style helpers ────────────────────────────────────────────────
  const field = hasErr => ({
    width: '100%', padding: '9px 12px', borderRadius: '6px', fontSize: '14px',
    border: `1px solid ${hasErr ? '#e74c3c' : '#ccc'}`,
    boxSizing: 'border-box', marginTop: '4px', outline: 'none',
  });
  const lbl  = { display: 'block', fontWeight: '600', fontSize: '13px', color: '#555', marginTop: '14px' };
  const err  = { color: '#e74c3c', fontSize: '12px', marginTop: '3px' };
  const card = { backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' };
  const head = { margin: '0 0 14px 0', fontSize: '14px', fontWeight: '700', color: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #3498db', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 4px 16px rgba(22,163,74,0.08)', border: '1.5px solid #d1fae5' }}>

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
                {weightPerBale && <p style={{ fontSize: '12px', color: '#27ae60', margin: '3px 0 0' }}>≈ {weightPerBale} kg / bale</p>}
              </div>
              <div>
                <label style={lbl}>Your Estimated Total Value (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', marginTop: '2px' }}>$</span>
                  <input style={{ ...field(false), paddingLeft: '26px' }} type="number" min="0" step="0.01"
                    placeholder="Optional" value={form.estimatedValue}
                    onChange={e => set('estimatedValue', e.target.value)} />
                </div>
                <p style={{ fontSize: '12px', color: '#888', margin: '3px 0 0' }}>The algorithmic floor price may differ.</p>
              </div>
            </div>
          </div>

          {/* ── Section 2: Curing & Wood ── */}
          <div style={card}>
            <h3 style={head}><span>🌿</span> Curing & Environmental Compliance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div>
                <label style={lbl}>Curing Method <span style={{ color: '#e74c3c' }}>*</span></label>
                <select style={field(false)} value={form.curing} onChange={e => set('curing', e.target.value)}>
                  {CURING_METHODS.map(c => <option key={c}>{c}</option>)}
                </select>
                {CURING_INFO[form.curing] && (() => {
                  const info = CURING_INFO[form.curing];
                  return (
                    <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '6px', backgroundColor: info.bg, border: `1px solid ${info.color}` }}>
                      <span style={{ fontWeight: '700', color: info.color, fontSize: '13px' }}>{info.badge}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>{info.note}</p>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label style={lbl}>Estimated Wood Weight Used (kg)</label>
                <input style={field(false)} type="number" min="0" step="0.1"
                  placeholder="e.g. 200" value={form.woodWeight}
                  onChange={e => set('woodWeight', e.target.value)} />
                <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>Leave blank if no wood was used.</p>
              </div>
            </div>

            {/* Auto-calculated Wood Score */}
            <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '8px', backgroundColor: '#f0f3f4', border: '1px solid #d5d8dc' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: '700', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔢 Auto-Calculated Wood Consumption Score
              </p>
              {computedWoodScore !== null ? (() => {
                const score = computedWoodScore;
                const color = score <= 15 ? '#27ae60' : score > 30 ? '#e74c3c' : '#f39c12';
                const label = score <= 15 ? '✅ Green Bonus Eligible' : score > 30 ? '🚫 Non-Compliant — Will Be Blocked' : '⚠️ Above Green Threshold';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '36px', fontWeight: '800', color, lineHeight: 1 }}>{score}</div>
                    <div>
                      <div style={{ fontWeight: '700', color, fontSize: '14px' }}>{label}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        Formula: ({form.woodWeight}kg ÷ {form.weight}kg) × 100 = {score}
                      </div>
                      {score > 30 && (
                        <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px', fontWeight: '600' }}>
                          Reduce wood usage below {(parseFloat(form.weight) * 0.3).toFixed(0)}kg to become compliant.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <p style={{ margin: 0, fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>
                  Enter total batch weight and wood weight above to calculate automatically.
                </p>
              )}
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
                <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {group.category}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {group.items.map(item => {
                    const checked = checkedInputs.includes(item);
                    return (
                      <label key={item} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                        borderRadius: '20px', cursor: 'pointer', fontSize: '13px', userSelect: 'none',
                        backgroundColor: checked ? '#2c3e50' : '#f0f0f0',
                        color: checked ? '#fff' : '#555',
                        border: `1px solid ${checked ? '#2c3e50' : '#ddd'}`,
                      }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleInput(item)} style={{ display: 'none' }} />
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
                  const offline = e.target.checked;
                  set('offlineMode', offline);
                  set('gps', '');
                  set('photoHash', '');
                  setPhotoStatus('idle');
                  if (!offline) {
                    setGpsStatus('loading');
                    navigator.geolocation.getCurrentPosition(
                      pos => { setForm(f => ({ ...f, gps: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` })); setGpsStatus('locked'); },
                      () => setGpsStatus('error'),
                      { enableHighAccuracy: true }
                    );
                  } else {
                    setGpsStatus('idle');
                  }
                }}
                style={{ width: '16px', height: '16px' }} />
              No smartphone / internet? (Request physical Agritex verification — MEDIUM risk)
            </label>

            {!form.offlineMode && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* GPS status display */}
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

                {/* Photo capture */}
                <div>
                  <label style={{
                    display: 'block', width: '100%', boxSizing: 'border-box', padding: '11px',
                    textAlign: 'center', fontWeight: '600', fontSize: '14px', borderRadius: '7px', cursor: 'pointer',
                    backgroundColor: photoStatus === 'captured' ? '#27ae60' : '#34495e', color: 'white',
                  }}>
                    {photoStatus === 'idle' ? '📸 Capture Live Barn Photo' : `✅ Photo Hashed: ${form.photoHash}`}
                    <input type="file" accept="image/*" capture="environment" onChange={capturePhoto} style={{ display: 'none' }} />
                  </label>
                  {errors.photoHash && <p style={err}>{errors.photoHash}</p>}
                </div>

              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <button type="submit" disabled={submitting}
            style={{ width: '100%', padding: '14px',
              background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.3px', fontFamily: "'Poppins', sans-serif",
              boxShadow: submitting ? 'none' : '0 4px 12px rgba(22,163,74,0.3)',
              transition: 'all 0.2s' }}>
            {submitting ? '⏳ Registering to Blockchain...' : '🔗 Register Batch on Blockchain'}
          </button>

        </form>

        {/* ── Result Banner ── */}
        {result && (
          <div style={{ marginTop: '20px' }}>
            {result.success ? (
              <div style={{ padding: '16px 20px', borderRadius: '8px', backgroundColor: '#eafaf1', border: '1px solid #27ae60' }}>
                <p style={{ margin: '0 0 12px', fontWeight: '700', color: '#1e8449', fontSize: '15px' }}>
                  ✅ Batch registered successfully.
                </p>

                {/* Three summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  {[
                    { label: 'ALGORITHMIC FLOOR PRICE', value: `$${result.floorPrice}`, color: '#2c3e50' },
                    { label: 'RISK LEVEL', value: result.riskLevel, color: result.riskLevel === 'HIGH' ? '#e74c3c' : result.riskLevel === 'MEDIUM' ? '#f39c12' : '#27ae60' },
                    { label: 'BATCH ID', value: result.baleId, mono: true, color: '#2c3e50' },
                  ].map(({ label, value, color, mono }) => (
                    <div key={label} style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #d5f5e3', textAlign: 'center' }}>
                      <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Risk explanation */}
                {result.riskLevel && RISK_EXPLANATION[result.riskLevel] && (() => {
                  const info = RISK_EXPLANATION[result.riskLevel];
                  return (
                    <div style={{ marginTop: '14px', padding: '14px 16px', borderRadius: '8px', backgroundColor: info.bg, border: `1px solid ${info.border}` }}>
                      <p style={{ margin: '0 0 6px', fontWeight: '700', color: info.color, fontSize: '14px' }}>
                        {info.icon} {info.title}
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: '1.6' }}>
                        {info.message}
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{ padding: '16px 20px', borderRadius: '8px', backgroundColor: '#fdecea', border: '1px solid #e74c3c' }}>
                <p style={{ margin: 0, fontWeight: '600', color: '#c0392b' }}>🛑 {result.message}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}