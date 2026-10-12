import AIFieldPresets, { completeExample } from './AIFieldPresets';
import useCancelableAI from './useCancelableAI';
import React, { useEffect, useRef, useState } from 'react';
import AIResultDisplay from './AIResultView';
import { getAIHistory, getAIReadiness, getAISourceRows } from '../services/api';
import { examplesFor, fieldsWithSources, sourceFields } from './wildlifeExamples';

/**
 * Generic AI feature page.
 * Props:
 *   - title, subtitle
 *   - feature: string  (matches backend `feature` column in ai_results, e.g. "plan-mission")
 *   - inputs: [{ key, label, type?, placeholder?, options?, defaultValue? }]
 *   - run: async (values) => result
 *   - buttonLabel?
 */
export default function AIPage({ title, subtitle, feature, inputs, run, buttonLabel = 'Generate with OpenRouter' }) {
  const initial = Object.fromEntries(
    (inputs || []).map((i) => [i.key, i.defaultValue ?? ''])
  );
  const [values, setValues] = useState(initial);
  const aiRequest = useCancelableAI();
  const { loading, result, error, setResult, setError } = aiRequest;



  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const samples = examplesFor(feature);
  const [sourceRows, setSourceRows] = useState({});
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [retry, setRetry] = useState(0);
  const historyRequest = useRef(null);
  const sourceResources = [...new Set((inputs || []).map(field => sourceFields[field.key]?.resource).filter(Boolean))].sort().join(',');
  const fields = fieldsWithSources(inputs, sourceRows, values);
  const formId = `wildlife-ai-${feature}`;
  useEffect(() => {
    const controller = new AbortController();
    setReadiness(null); setSourceRows({}); setSourceError('');
    getAIReadiness({ signal: controller.signal }).then(data => {
      if (typeof data?.available !== 'boolean' || typeof data?.message !== 'string') throw new Error('The server returned invalid AI readiness data.');
      if (!controller.signal.aborted) setReadiness(data);
    }).catch(error => { if (!controller.signal.aborted) setReadiness({ available: false, message: error.message }); });
    const resources = sourceResources ? sourceResources.split(',') : [];
    setSourceLoading(resources.length > 0);
    Promise.all(resources.map(async resource => {
      const rows = await getAISourceRows(resource, { signal: controller.signal });
      const sourceKey = Object.values(sourceFields).find(source => source.resource === resource).sourceKey;
      if (!Array.isArray(rows) || rows.some(row => !row || !Number.isInteger(Number(row.id)) || Number(row.id) < 1 || row[sourceKey] == null || String(row[sourceKey]).trim() === '')) throw new Error(`Could not load valid saved records from ${resource}.`);
      return [resource, rows];
    })).then(entries => { if (!controller.signal.aborted) setSourceRows(Object.fromEntries(entries)); })
      .catch(error => { if (!controller.signal.aborted) setSourceError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setSourceLoading(false); });
    return () => controller.abort();
  }, [feature, sourceResources, retry]);
  useEffect(() => () => historyRequest.current?.abort(), []);

  const setField = (k, v) => { setResult(null); setValues((s) => ({ ...s, [k]: v, ...(k === 'camera_id' ? { attachment_id: '' } : {}) })); };

  const applySample = (sample, index = 0) => {
    const filled = completeExample(fields, sample || {}, index, title, values);
    // Rebind an optional upload to the camera selected in this same click.
    setValues(completeExample(fieldsWithSources(inputs, sourceRows, filled), sample || {}, index, title, filled));
    setResult(null); setError(null);
  };

  const handleRun = async (event) => {
    event?.preventDefault();
    if (!readiness?.available) { setError(readiness?.message || 'Checking AI availability. Please wait.'); return; }
    if (sourceLoading || sourceError) { setError(sourceError || 'Please wait for saved sources to load.'); return; }
    for (const field of fields) {
      const value = values[field.key];
      if (field.requiresExistingRecord && ((field.required && !value) || (value !== '' && value != null && !field.options.some(option => String(option.value) === String(value))))) { setError(`Select an available saved ${field.label.toLowerCase()} before generating.`); return; }
      if (field.type === 'number' && value !== '' && (!Number.isFinite(Number(value)) || (field.min !== undefined && Number(value) < field.min) || (field.max !== undefined && Number(value) > field.max) || (field.step === 1 && !Number.isInteger(Number(value))))) { setError(`Enter a valid ${field.label.toLowerCase()}.`); return; }
    }
    return aiRequest.run((options) => run(values, options));
  };

  const openHistory = async () => {
    historyRequest.current?.abort();
    const controller = new AbortController(); historyRequest.current = controller;
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryRows([]);
    try {
      const rows = await getAIHistory(feature, 50, { signal: controller.signal });
      if (!Array.isArray(rows)) throw new Error('The server returned invalid history data.');
      if (!controller.signal.aborted) setHistoryRows(rows);
    } catch (e) {
      if (!controller.signal.aborted) setHistoryError(e.message);
    } finally {
      if (!controller.signal.aborted) setHistoryLoading(false);
    }
  };
  const closeHistory = () => { historyRequest.current?.abort(); setHistoryOpen(false); };

  return (
    <div className="sr-ai-workspace">
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="page-header-actions">
          {feature && (
            <button className="btn secondary" onClick={openHistory}>History</button>
          )}
          <button type="submit" form={formId} className="btn ai" disabled={loading || !readiness?.available || sourceLoading || Boolean(sourceError)}>
            {loading ? <><span className="spinner" />Running...</> : buttonLabel}
          </button>
          {loading && <button type="button" className="btn secondary btn-secondary" onClick={aiRequest.cancel}>Cancel</button>}
        </div>
      </div>

      <div className="card" role="status">
        <strong>{readiness?.available ? 'OpenRouter ready for evaluation' : 'AI execution unavailable'}</strong>
        <p>{readiness?.message || 'Checking server configuration…'}</p>
        <button type="button" className="btn secondary" disabled={loading} onClick={() => setRetry(value => value + 1)}>Check again</button>
      </div>
      {sourceLoading && <p role="status">Loading saved source records…</p>}
      {sourceError && <div className="ai-error" role="alert">{sourceError} <button type="button" className="btn secondary" onClick={() => setRetry(value => value + 1)}>Retry sources</button></div>}
      <AIFieldPresets fields={fields} samples={samples} context={title} disabled={loading || sourceLoading || Boolean(sourceError)} onFill={applySample} />
      {!fields.length && <p>This feature uses saved records. It has no editable AI inputs.</p>}
      {aiRequest.notice && <div className="sr-notice" role="status">{aiRequest.notice}</div>}

      <form id={formId} onSubmit={handleRun}>
      {(fields.length > 0) && (
        <div className="card">
          <div className="form-grid">
            {fields.map((i) => (
              <div key={i.key} className={`form-group ${i.type === 'textarea' ? 'full-width' : ''}`}>
                <label htmlFor={`${formId}-${i.key}`}>{i.label}</label>
                {i.type === 'select' ? (
                  <select id={`${formId}-${i.key}`} name={i.key} required={i.required} disabled={loading || sourceLoading} value={values[i.key] ?? ''} onChange={(e) => setField(i.key, i.valueType === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}>
                    <option value="">{i.required ? 'Select a saved record' : 'No source selected (optional)'}</option>
                    {(i.options || []).map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                  </select>
                ) : i.type === 'textarea' ? (
                  <textarea
                    id={`${formId}-${i.key}`} name={i.key} disabled={loading}
                    placeholder={i.placeholder || ''}
                    value={values[i.key] ?? ''}
                    onChange={(e) => setField(i.key, e.target.value)}
                  />
                ) : (
                  <input
                    id={`${formId}-${i.key}`} name={i.key} disabled={loading} min={i.min} max={i.max} step={i.step}
                    type={i.type || 'text'}
                    placeholder={i.placeholder || ''}
                    value={values[i.key] ?? ''}
                    onChange={(e) =>
                      setField(i.key, i.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </form>
      {result && <button type="button" className="btn secondary" onClick={() => { setResult(null); document.getElementById(formId)?.querySelector('input, textarea, select')?.focus(); }}>Edit inputs</button>}

      <AIResultDisplay
        result={result}
        loading={loading}
        error={error}
        feature={feature}
        title={title}
      />

      {historyOpen && (
        <div className="modal-overlay" onClick={closeHistory}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h3>{title} · History</h3>
              <button className="modal-close" onClick={closeHistory}>×</button>
            </div>
            <div className="modal-body">
              {historyLoading && <div className="empty-state">Loading history...</div>}
              {historyError && <div className="ai-error" role="alert">{historyError} <button type="button" className="btn secondary" onClick={openHistory}>Retry history</button></div>}
              {!historyLoading && !historyError && historyRows.length === 0 && (
                <div className="empty-state">No past results for this feature yet.</div>
              )}
              {historyRows.map((row) => (
                <div key={row.id} className="history-entry">
                  <div className="history-entry-meta">
                    <span className="history-entry-id">#{row.id}</span>
                    <span className="history-entry-time">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  {row.input && Object.keys(row.input).length > 0 && (
                    <details>
                      <summary>Input parameters</summary>
                      <div style={{ marginTop: 8 }}>
                        <AIResultDisplay result={row.input} feature={`${feature}-input`} title="Input" />
                      </div>
                    </details>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <AIResultDisplay result={row.output} feature={feature} title={title} />
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={closeHistory}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
