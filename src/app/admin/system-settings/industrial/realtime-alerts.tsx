import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  AdminPageHeader,
  AdminStickyActionBar,
  adminFieldErrorStyle,
  adminPageShellStyle,
} from '@/components/admin/AdminUi';
import { useAdminFeedback } from '@/hooks/useAdminFeedback';
import { realtimeAlertsConfig } from '@/industrial/realtime/config';
import {
  getRealtimeAlertsConfig,
  loadRealtimeAlertsConfig,
  saveRealtimeAlertsConfig,
} from '@/industrial/realtime/realtimeAlertsConfigStore';
import {
  REALTIME_ALERTS_LIMITS,
  validateRealtimeAlertsConfig,
  type RealtimeAlertsConfig,
} from '@/industrial/realtime/realtimeAlertsValidation';
import { IndustrialLayout, useIndustrialPageState } from '@/industrial/ui/components';

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  error?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
      <input
        className="input"
        type="number"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span style={{ fontSize: 11, color: '#64748b' }}>
        Intervalo: {min} – {max}
      </span>
      {error ? <span style={adminFieldErrorStyle}>{error}</span> : null}
    </label>
  );
}

const FIELD_LABELS: Record<keyof RealtimeAlertsConfig, string> = {
  taskDelayMinutes: 'Task Delay (min)',
  maxQueueSize: 'Max Queue Size',
  rejectionLimitPercent: 'Rejection Limit (%)',
  reworkLimitPercent: 'Rework Limit (%)',
  idleProductionMinutes: 'Idle Production (min)',
};

export default function RealtimeAlertsAdminPage() {
  useIndustrialPageState();
  const feedback = useAdminFeedback();
  const [draft, setDraft] = useState<RealtimeAlertsConfig>({ ...realtimeAlertsConfig });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RealtimeAlertsConfig, string>>>({});

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadRealtimeAlertsConfig();
      setDraft({ ...getRealtimeAlertsConfig() });
      setLoading(false);
    })();
  }, []);

  const updateField = useCallback((field: keyof RealtimeAlertsConfig, value: number) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const validation = validateRealtimeAlertsConfig(draft);
    const nextErrors: Partial<Record<keyof RealtimeAlertsConfig, string>> = {};
    for (const err of validation.errors) {
      const field = (Object.keys(FIELD_LABELS) as Array<keyof RealtimeAlertsConfig>).find((key) =>
        err.startsWith(`${key}:`),
      );
      if (field) nextErrors[field] = err;
    }
    setFieldErrors(nextErrors);
    setDraft(validation.normalized);

    setSaving(true);
    const result = await saveRealtimeAlertsConfig(validation.normalized);
    setSaving(false);

    if (result.success) {
      feedback.success('Limites de alertas RTO guardados.');
    } else if (result.errors.length > 0) {
      feedback.warning(result.errors[0] ?? 'Configuração guardada com avisos.');
    } else {
      feedback.warning('Configuração validada localmente; verifique ligação à base de dados.');
    }
  }, [draft, feedback]);

  const handleResetDefaults = useCallback(() => {
    setDraft({ ...realtimeAlertsConfig });
    setFieldErrors({});
    feedback.success('Valores por defeito carregados no formulário. Guarde para persistir.');
  }, [feedback]);

  return (
    <IndustrialLayout
      title="Realtime Alerts"
      description="Admin → System Settings → Industrial → limites do AlertsEngine RTO."
    >
      <div style={adminPageShellStyle}>
        <AdminPageHeader
          title="Alertas Industriais em Tempo Real"
          subtitle="Configura os limiares do AlertsEngine. Valores guardados em system_settings com fallback para config.ts."
        />

        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          <Link to="/admin/settings/industrial" style={{ color: '#60a5fa' }}>
            ← Industrial Settings
          </Link>
          {' · '}
          <Link to="/admin" style={{ color: '#60a5fa' }}>
            System Settings
          </Link>
        </p>

        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>A carregar configuração…</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              marginTop: 16,
            }}
          >
            {(Object.keys(FIELD_LABELS) as Array<keyof RealtimeAlertsConfig>).map((field) => (
              <NumberField
                key={field}
                label={FIELD_LABELS[field]}
                value={draft[field]}
                onChange={(value) => updateField(field, value)}
                min={REALTIME_ALERTS_LIMITS[field].min}
                max={REALTIME_ALERTS_LIMITS[field].max}
                error={fieldErrors[field]}
              />
            ))}
          </div>
        )}

        <AdminStickyActionBar>
          <button type="button" className="btn btn-secondary" onClick={handleResetDefaults} disabled={loading || saving}>
            Repor defeitos
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleSave()} disabled={loading || saving}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </AdminStickyActionBar>
      </div>
    </IndustrialLayout>
  );
}
