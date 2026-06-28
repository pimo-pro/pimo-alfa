import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconSepararCaixas = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      {/* two boxes with arrows pointing outward */}
      <rect x="2" y="8" width="7" height="8" rx="1" />
      <rect x="15" y="8" width="7" height="8" rx="1" />
      <path d="M9 12H6m0 0l-2-2m2 2l-2 2" />
      <path d="M15 12h3m0 0l2-2m-2 2l2 2" />
    </IconBase>
  )
);

IconSepararCaixas.displayName = 'IconSepararCaixas';
