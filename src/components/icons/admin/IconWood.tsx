import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconWood = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h10M7 14h7" />
      <circle cx="16.5" cy="13" r="0.8" fill="currentColor" stroke="none" />
    </IconBase>
  )
);

IconWood.displayName = 'IconWood';
