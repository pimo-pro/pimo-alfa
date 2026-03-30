import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconUndo = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M9 14L4 9l5-5" />
      <path d="M20 20a8 8 0 0 0-8-8H4" />
    </IconBase>
  )
);

IconUndo.displayName = 'IconUndo';