import { forwardRef } from 'react';

export interface IconBaseProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

export const IconBase = forwardRef<SVGSVGElement, IconBaseProps>(
  ({ size = 20, color = 'currentColor', children, className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
);

IconBase.displayName = 'IconBase';