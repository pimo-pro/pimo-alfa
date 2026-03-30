import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconSave = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M5 3h12l2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M7 3v6h8V3" />
      <path d="M8 16h8" />
    </IconBase>
  )
);

IconSave.displayName = 'IconSave';
