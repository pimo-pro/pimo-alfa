import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconRedo = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M15 14l5-5-5-5" />
      <path d="M4 20a8 8 0 0 1 8-8h8" />
    </IconBase>
  )
);

IconRedo.displayName = 'IconRedo';