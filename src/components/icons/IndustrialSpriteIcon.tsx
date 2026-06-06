import type { CSSProperties } from 'react';

/** Nomes disponíveis no sprite central `public/icons/pimo-industrial-sprite.svg`. */
export type IndustrialSpriteIconName =
  | 'industrial-supervisor'
  | 'industrial-overview'
  | 'industrial-stations'
  | 'industrial-projects'
  | 'industrial-quality'
  | 'industrial-time'
  | 'industrial-chat'
  | 'industrial-alerts'
  | 'industrial-canvas-3d'
  | 'industrial-info'
  | 'industrial-success';

const SPRITE_PATH = '/icons/pimo-industrial-sprite.svg';

export interface IndustrialSpriteIconProps {
  name: IndustrialSpriteIconName;
  size?: number;
  color?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Helper único para ícones industriais — todas as referências vêm do sprite central.
 * Uso: `<IndustrialSpriteIcon name="industrial-supervisor" />`
 */
export default function IndustrialSpriteIcon({
  name,
  size = 18,
  color = 'currentColor',
  title,
  className,
  style,
}: IndustrialSpriteIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ color, ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <use href={`${SPRITE_PATH}#${name}`} width={size} height={size} />
    </svg>
  );
}
