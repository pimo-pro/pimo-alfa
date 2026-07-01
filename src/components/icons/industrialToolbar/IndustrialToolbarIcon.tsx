import financeUrl from "./finance.svg";
import industrialUrl from "./industrial.svg";
import operationsUrl from "./operations.svg";

export type IndustrialToolbarIconName = "finance" | "industrial" | "operations";

const SRC: Record<IndustrialToolbarIconName, string> = {
  finance: financeUrl,
  industrial: industrialUrl,
  operations: operationsUrl,
};

type Props = {
  name: IndustrialToolbarIconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function IndustrialToolbarIcon({ name, size = 18, className, style }: Props) {
  return (
    <img
      src={SRC[name]}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className}
      style={{ display: "block", flexShrink: 0, opacity: 0.92, ...style }}
    />
  );
}
