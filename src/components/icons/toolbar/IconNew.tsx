import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconNew = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  )
);

IconNew.displayName = 'IconNew';