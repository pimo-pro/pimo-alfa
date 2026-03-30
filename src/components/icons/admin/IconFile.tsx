import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconFile = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14,3 14,8 19,8" />
    </IconBase>
  )
);

IconFile.displayName = 'IconFile';
