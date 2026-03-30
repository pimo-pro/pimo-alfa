import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconRuler = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <rect x="3" y="9" width="18" height="6" rx="1" />
      <path d="M7 9v3M10 9v2M13 9v3M16 9v2M19 9v3" />
    </IconBase>
  )
);

IconRuler.displayName = 'IconRuler';
