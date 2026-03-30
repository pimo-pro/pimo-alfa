import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconFlask = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M10 2v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 16l-5-9V2" />
      <path d="M9 7h6" />
    </IconBase>
  )
);

IconFlask.displayName = 'IconFlask';
