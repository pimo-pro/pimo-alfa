import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconUser = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} size={18} {...props}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </IconBase>
  )
);

IconUser.displayName = 'IconUser';