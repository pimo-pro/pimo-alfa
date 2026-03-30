import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconChartUp = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 14l4-4 3 3 4-5" />
    </IconBase>
  )
);

IconChartUp.displayName = 'IconChartUp';
