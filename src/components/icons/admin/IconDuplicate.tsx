import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconDuplicate = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <rect x="9" y="9" width="10" height="10" rx="2" ry="2" />
      <rect x="5" y="5" width="10" height="10" rx="2" ry="2" />
    </IconBase>
  )
);

IconDuplicate.displayName = 'IconDuplicate';