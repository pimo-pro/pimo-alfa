import { forwardRef } from "react";

export interface IconIndustrialDesignProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

/** Lápis + cubo — Design Industrial (stroke 1.5, 22×22, #64748b). */
export const IconIndustrialDesign = forwardRef<SVGSVGElement, IconIndustrialDesignProps>(
  ({ size = 22, color = "#64748b", className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <path d="M4 10 12 5.5 20 10v8.5L12 23l-8-4.5V10z" />
      <path d="M12 5.5V14" />
      <path d="M4 10 12 14.5 20 10" />
      <path d="M16.5 3.5 20.5 7.5" />
      <path d="m18.5 5.5-6.5 6.5" />
      <path d="M8.5 16.5 6 20" />
    </svg>
  )
);

IconIndustrialDesign.displayName = "IconIndustrialDesign";
