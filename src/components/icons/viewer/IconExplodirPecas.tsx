import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconExplodirPecas = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      {/* central box with pieces exploding outward */}
      <rect x="9" y="9" width="6" height="6" rx="0.5" />
      <path d="M12 9V5m0 0l-2 2m2-2l2 2" />
      <path d="M12 15v4m0 0l-2-2m2 2l2-2" />
      <path d="M9 12H5m0 0l2-2m-2 2l2 2" />
      <path d="M15 12h4m0 0l-2-2m2 2l-2 2" />
    </IconBase>
  )
);

IconExplodirPecas.displayName = 'IconExplodirPecas';
