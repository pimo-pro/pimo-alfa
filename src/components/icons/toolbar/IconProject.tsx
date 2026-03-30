import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconProject = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M3 7h18" />
      <path d="M3 7l2-3h14l2 3" />
      <rect x="3" y="7" width="18" height="14" rx="2" ry="2" />
    </IconBase>
  )
);

IconProject.displayName = 'IconProject';