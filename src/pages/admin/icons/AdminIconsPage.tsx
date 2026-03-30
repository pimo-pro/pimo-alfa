import { useState, useMemo } from 'react';
import { allIcons, iconSections, type IconName } from '@/components/icons/getAllIcons';

type Section = keyof typeof iconSections;

export default function AdminIconsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState(24);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [activeSection, setActiveSection] = useState<Section | 'all'>('all');

  // Filter icons based on search and section
  const filteredIcons = useMemo(() => {
    const sections = Object.entries(iconSections).reduce((acc, [key, icons]) => {
      acc[key as Section] = [...icons];
      return acc;
    }, {} as Record<Section, IconName[]>);

    // Ensure all icons from getAllIcons are listed even if iconSections is not in sync
    const allIconNames = Object.keys(allIcons) as IconName[];
    const includedIcons = new Set(Object.values(sections).flat());
    const missingIcons = allIconNames.filter((iconName) => !includedIcons.has(iconName));

    if (missingIcons.length > 0) {
      if (!sections.misc) {
        sections.misc = [];
      }
      missingIcons.forEach((iconName) => {
        if (!sections.misc.includes(iconName)) {
          sections.misc.push(iconName);
        }
      });
    }

    const result = Object.keys(sections).reduce((acc, key) => {
      acc[key as Section] = [];
      return acc;
    }, {} as Record<Section, IconName[]>);

    const query = searchQuery.toLowerCase();

    Object.entries(sections).forEach(([section, icons]) => {
      const sectionKey = section as Section;

      if (activeSection !== 'all' && activeSection !== sectionKey) {
        return;
      }

      const filtered = icons.filter((iconName) => iconName.toLowerCase().includes(query));
      result[sectionKey] = filtered;
    });

    return result;
  }, [searchQuery, activeSection]);

  const allEmptyResult = Object.values(filteredIcons).every((arr) => arr.length === 0);

  const handleCopyName = (iconName: IconName) => {
    navigator.clipboard.writeText(iconName);
  };

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: 'var(--text-main)' }}>
          Gerenciar Ícones
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Visualize, procure e configure todos os ícones da biblioteca.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
          padding: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius)',
        }}
      >
        {/* Search */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Buscar ícone
          </label>
          <input
            type="text"
            placeholder="Ex: Icon, User, Settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--text-main)',
              fontSize: 12,
            }}
          />
        </div>

        {/* Filter by Section */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Filtrar por seção
          </label>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as Section | 'all')}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--text-main)',
              fontSize: 12,
            }}
          >
            <option value="all">Todas as seções</option>
            <option value="header">Header</option>
            <option value="admin">Admin</option>
            <option value="toolbar">Toolbar</option>
            <option value="viewer">Viewer</option>
            <option value="misc">Misc</option>
          </select>
        </div>

        {/* Size Control */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Tamanho: {selectedSize}px
          </label>
          <input
            type="range"
            min="12"
            max="48"
            value={selectedSize}
            onChange={(e) => setSelectedSize(Number(e.target.value))}
            style={{
              width: '100%',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Color Control */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Cor dos ícones
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{
                width: 40,
                height: 32,
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.2)',
                color: 'var(--text-main)',
                fontSize: 12,
              }}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {allEmptyResult ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          Nenhum ícone encontrado com os critérios de busca.
        </div>
      ) : (
        Object.entries(filteredIcons).map(([section, icons]) => {
          if (icons.length === 0) return null;

          return (
            <div key={section} style={{ marginBottom: 32 }}>
              {/* Section Title */}
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  color: 'var(--text-main)',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {section}
              </h3>

              {/* Icon Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                {icons.map((iconName) => {
                  const IconComponent = allIcons[iconName];

                  return (
                    <div
                      key={iconName}
                      style={{
                        padding: 12,
                        borderRadius: 'var(--radius)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {/* Icon Preview */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: 'var(--radius)',
                          background: 'rgba(59,130,246,0.1)',
                          border: '1px solid rgba(59,130,246,0.25)',
                        }}
                      >
                        <IconComponent size={selectedSize} color={selectedColor} />
                      </div>

                      {/* Icon Name */}
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          wordBreak: 'break-word',
                          textAlign: 'center',
                          maxWidth: '100%',
                        }}
                      >
                        {iconName}
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                        }}
                      >
                        Seção: {section}
                      </div>

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyName(iconName)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: 'var(--radius)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }}
                      >
                        Copiar nome
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
