import { getMaterialByIdOrLabel } from "../../../core/materials/service";
import { isMaterialMadeira } from "../../../core/materials/nestingGrainLock";

type Props = {
  materialId: string;
  lockWoodGrain?: boolean;
  onChange: (lock: boolean) => void;
  compact?: boolean;
};

/** Toggle “Manter veio da madeira” — activo automaticamente em materiais com veio. */
export default function WoodGrainLockToggle({
  materialId,
  lockWoodGrain,
  onChange,
  compact = false,
}: Props) {
  const mat = getMaterialByIdOrLabel(materialId);
  const madeira = isMaterialMadeira(materialId) || mat?.materialMadeira === true;
  const autoLocked = madeira;
  const checked = autoLocked || lockWoodGrain === true;
  const label = compact ? "Manter veio" : "Manter veio da madeira (proibir rotação)";

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        marginTop: compact ? 0 : 4,
      }}
      title={
        autoLocked
          ? "Material de madeira: veio fixo no nesting e TCN."
          : "Activado = peça não pode rodar no nesting."
      }
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={autoLocked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
