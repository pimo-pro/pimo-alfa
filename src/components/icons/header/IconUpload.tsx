import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconUpload = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} size={18} {...props}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
    </IconBase>
  )
);

IconUpload.displayName = 'IconUpload';