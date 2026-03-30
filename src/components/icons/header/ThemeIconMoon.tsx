import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const ThemeIconMoon = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} size={18} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </IconBase>
  )
);

ThemeIconMoon.displayName = 'ThemeIconMoon';