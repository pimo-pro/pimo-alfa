export const industrialAdminUiSchema = [
  {
    id: 'general',
    label: 'Geral',
    fields: ['operationsUi', 'realtimeTracking'],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    fields: ['initialStatus', 'completionStatus', 'allowManualTransitions'],
  },
  {
    id: 'quality',
    label: 'Qualidade',
    fields: ['qualityGate', 'reworkFlow'],
  },
] as const;
