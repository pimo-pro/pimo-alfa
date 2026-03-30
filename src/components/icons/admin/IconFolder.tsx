import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconFolder = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </IconBase>
  )
);

IconFolder.displayName = 'IconFolder';
