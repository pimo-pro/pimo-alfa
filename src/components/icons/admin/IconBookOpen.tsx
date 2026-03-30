import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconBookOpen = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M3 6a3 3 0 0 1 3-3h5v16H6a3 3 0 0 0-3 3z" />
      <path d="M21 6a3 3 0 0 0-3-3h-5v16h5a3 3 0 0 1 3 3z" />
    </IconBase>
  )
);

IconBookOpen.displayName = 'IconBookOpen';
