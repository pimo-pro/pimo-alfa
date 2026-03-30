import { forwardRef } from 'react';
import { IconBase } from '../IconBase';

export const IconPuzzle = forwardRef<SVGSVGElement, React.ComponentProps<typeof IconBase>>(
  (props, ref) => (
    <IconBase ref={ref} {...props}>
      <path d="M9 4h2a2 2 0 1 1 4 0h2a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2h-2a2 2 0 1 1-4 0H9a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4V6a2 2 0 0 1 2-2z" />
    </IconBase>
  )
);

IconPuzzle.displayName = 'IconPuzzle';
