export interface IndustrialPageState {
  isReady: boolean;
  source: 'placeholder';
}

export function useIndustrialPageState(): IndustrialPageState {
  return {
    isReady: true,
    source: 'placeholder',
  };
}
