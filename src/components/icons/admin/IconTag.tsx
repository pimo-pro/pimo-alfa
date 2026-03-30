import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconTag = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M20 10l-8 8-8-8V4h6z" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </IconBase>
  )
);

IconTag.displayName = 'IconTag';
