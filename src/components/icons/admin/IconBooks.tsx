import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconBooks = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M5 6h10v4H5z" />
      <path d="M9 10h10v4H9z" />
      <path d="M5 14h10v4H5z" />
    </IconBase>
  )
);

IconBooks.displayName = 'IconBooks';
