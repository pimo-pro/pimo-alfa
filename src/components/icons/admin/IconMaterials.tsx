import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconMaterials = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      <path d="M8 12h8M10 8h4" />
    </IconBase>
  )
);

IconMaterials.displayName = 'IconMaterials';