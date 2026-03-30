import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconPalette = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M12 3a9 9 0 1 0 0 18h1a3 3 0 0 0 0-6h-1a2 2 0 0 1 0-4h1a3 3 0 0 0 0-6h-1z" />
      <circle cx="7.5" cy="10" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="7" r="0.7" fill="currentColor" stroke="none" />
    </IconBase>
  )
);

IconPalette.displayName = 'IconPalette';
