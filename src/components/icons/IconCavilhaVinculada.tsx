import { forwardRef } from "react";

export interface IconCavilhaVinculadaProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

/**
 * — cone da ferramenta —Cavilha vinculada 10–40— (bege) —
 * cilindro —10 — 40 mm com marca de par espessura?face.
 */
export const IconCavilhaVinculada = forwardRef<SVGSVGElement, IconCavilhaVinculadaProps>(
  ({ size = 22, color = "#d2b48c", className, ...props }, ref) => (
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
      {/* Corpo da cavilha */}
      <rect x="5" y="9" width="14" height="6" rx="3" fill={`${color}33`} />
      <ellipse cx="5" cy="12" rx="2" ry="3" fill={`${color}55`} />
      <ellipse cx="19" cy="12" rx="2" ry="3" />
      {/* Marcas 30 / 13 */}
      <path d="M8 9v6" opacity="0.7" />
      <path d="M16.5 9v6" opacity="0.7" />
      {/* Ligação A?B */}
      <path d="M7 5h4" />
      <path d="M13 5h4" />
      <path d="M11 5v2" />
      <path d="M13 5v2" />
      <path d="M7 19h10" opacity="0.5" />
    </svg>
  )
);

IconCavilhaVinculada.displayName = "IconCavilhaVinculada";
