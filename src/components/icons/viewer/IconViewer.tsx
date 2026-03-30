import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconViewer = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  )
);

IconViewer.displayName = 'IconViewer';