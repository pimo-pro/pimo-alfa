import type { BarcodeEntityType, ParsedBarcode } from './types';

const barcodeRoutes: Record<string, { entityType: BarcodeEntityType; routeBase: string }> = {
  P: { entityType: 'project', routeBase: '/projects' },
  PC: { entityType: 'piece', routeBase: '/pieces' },
  C: { entityType: 'department', routeBase: '/work' },
  T: { entityType: 'task', routeBase: '/tasks' },
  CMD: { entityType: 'command', routeBase: '/commands' },
};

export function validateBarcodeFormat(barcode: string): boolean {
  return parseBarcode(barcode) !== null;
}

export function parseBarcode(barcode: string): ParsedBarcode | null {
  if (!barcode || typeof barcode !== 'string') return null;

  const [prefix, ...rest] = barcode.split('-');
  const id = rest.join('-');
  const routeConfig = barcodeRoutes[prefix];
  if (!routeConfig || !id) return null;

  return {
    raw: barcode,
    prefix,
    id,
    entityType: routeConfig.entityType,
    route: `${routeConfig.routeBase}/${id}`,
  };
}

export function getRouteFromBarcode(barcode: string): string | null {
  return parseBarcode(barcode)?.route ?? null;
}

/**
 * Adapter puro: a UI da Fase 3C decide como navegar usando a rota devolvida.
 */
export function routeBarcode(barcode: string, navigate: (_route: string) => void): void {
  const route = getRouteFromBarcode(barcode);
  if (!route) throw new Error('Invalid barcode format');
  navigate(route);
}

export function stopScanning(): void {
  // Scanner fisico/camera sera integrado na Fase 3C.
}
