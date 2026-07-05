export type IndustrialToolbarIconName = "finance" | "industrial" | "operations";

const PATHS: Record<IndustrialToolbarIconName, React.ReactNode> = {
  finance: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  industrial: (
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
  ),
  operations: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
};

type Props = {
  name: IndustrialToolbarIconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function IndustrialToolbarIcon({ name, size = 18, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={{ display: "block", flexShrink: 0, opacity: 0.92, ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}
