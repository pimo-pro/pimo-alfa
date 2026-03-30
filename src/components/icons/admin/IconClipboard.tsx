import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconClipboard = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4.5h6M9 10h6M9 14h6" />
    </IconBase>
  )
);

IconClipboard.displayName = 'IconClipboard';
