/**
 * Input numérico controlado que permite digitar livremente e atualiza o estado no blur/Enter.
 * Evita que o valor seja sobrescrito durante a digitação (ex.: "10" → digitar "1" não vira 1 e trava).
 */

import { useState, useRef, useEffect } from "react";

export type NumericInputProps = {
  value: number;
  onChange: (_value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Unidade exibida ao lado (ex.: "mm") */
  unit?: string;
  /** Se definido, formata o valor exibido quando não está em foco (ex.: 0 casas decimais). */
  formatDisplay?: (_n: number) => string;
};

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step: _step = 1,
  className = "input input-xs",
  style,
  unit,
  formatDisplay = (n) => String(n),
}: NumericInputProps) {
  const [localValue, setLocalValue] = useState<string>(() => formatDisplay(value));
  const [isFocused, setIsFocused] = useState(false);
  const lastCommittedRef = useRef(value);

  useEffect(() => {
    if (!isFocused && value !== lastCommittedRef.current) {
      lastCommittedRef.current = value;
      setLocalValue(formatDisplay(value));
    }
  }, [value, isFocused, formatDisplay]);

  const commit = (raw: string) => {
    const parsed = raw.trim().replace(",", ".");
    const n = parsed === "" ? lastCommittedRef.current : Number(parsed);
    const clamped = !Number.isFinite(n)
      ? lastCommittedRef.current
      : min != null && n < min
        ? min
        : max != null && n > max
          ? max
          : n;
    lastCommittedRef.current = clamped;
    setLocalValue(formatDisplay(clamped));
    onChange(clamped);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="text"
        inputMode="decimal"
        className={className}
        style={style}
        value={isFocused ? localValue : formatDisplay(value)}
        onFocus={() => {
          setIsFocused(true);
          setLocalValue(String(value));
        }}
        onBlur={() => {
          setIsFocused(false);
          commit(localValue);
        }}
        onChange={(e) => {
          setLocalValue(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {unit != null && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{unit}</span>}
    </div>
  );
}
