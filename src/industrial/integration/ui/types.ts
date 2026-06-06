export interface IndustrialUiOption {
  value: string;
  label: string;
}

export interface IndustrialUiCard {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  meta?: Record<string, unknown>;
}

export interface IndustrialUiActionIntent<TPayload> {
  type: string;
  payload: TPayload;
}
