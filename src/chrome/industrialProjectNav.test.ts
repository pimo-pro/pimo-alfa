import { describe, expect, it } from 'vitest';

import {
  extractIndustrialProjectSlug,
  industrialRailHref,
} from './industrialProjectNav';

describe('industrialProjectNav', () => {
  it('extrai slug de estacao com projecto', () => {
    expect(
      extractIndustrialProjectSlug('/industrial/work-orders/drill/Antunes_Novo_Cozinha'),
    ).toBe('Antunes_Novo_Cozinha');
  });

  it('extrai slug do hub de ordens', () => {
    expect(
      extractIndustrialProjectSlug('/industrial/work-orders/order/Antunes_Novo_Cozinha'),
    ).toBe('Antunes_Novo_Cozinha');
  });

  it('nao trata UUID de WO como slug', () => {
    expect(
      extractIndustrialProjectSlug(
        '/industrial/work-orders/order/550e8400-e29b-41d4-a716-446655440000',
      ),
    ).toBeNull();
  });

  it('rail NES preserva projecto; SUP vai para supervisor', () => {
    const slug = 'Antunes_Novo_Cozinha';
    expect(industrialRailHref('nesting', slug)).toBe(
      '/industrial/work-orders/nesting/Antunes_Novo_Cozinha',
    );
    expect(industrialRailHref('warehouse', slug)).toBe(
      '/industrial/supervisor/Antunes_Novo_Cozinha',
    );
  });
});
