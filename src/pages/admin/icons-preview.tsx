import { useState } from 'react';
import { allIcons, type IconName, iconSections } from '../../components/icons/getAllIcons';

export default function IconsPreviewPage() {
  const [globalSize, setGlobalSize] = useState(24);
  const [globalColor, setGlobalColor] = useState('#000000');

  const renderSection = (sectionName: string, iconNames: IconName[]) => (
    <div key={sectionName} style={{ marginBottom: 48 }}>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 'bold', textTransform: 'capitalize' }}>
        {sectionName}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {iconNames.map((iconName) => {
          const IconComponent = allIcons[iconName];
          return (
            <div
              key={iconName}
              style={{
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8,
                textAlign: 'center',
                background: '#fafafa',
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <IconComponent size={globalSize} color={globalColor} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>
                {iconName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24, fontSize: 28, fontWeight: 'bold' }}>
        Ícones SVG - Pré-visualização
      </h1>

      {/* Controles Globais */}
      <div style={{ marginBottom: 32, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18 }}>Controles Globais</h3>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <label>
            Tamanho:
            <input
              type="range"
              min="12"
              max="48"
              value={globalSize}
              onChange={(e) => setGlobalSize(Number(e.target.value))}
              style={{ marginLeft: 8 }}
            />
            <span style={{ marginLeft: 8 }}>{globalSize}px</span>
          </label>
          <label>
            Cor:
            <input
              type="color"
              value={globalColor}
              onChange={(e) => setGlobalColor(e.target.value)}
              style={{ marginLeft: 8, width: 40, height: 32, border: 'none', cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>

      {/* Seções de Ícones */}
      {Object.entries(iconSections).map(([sectionName, iconNames]) =>
        renderSection(sectionName, iconNames)
      )}
    </div>
  );
}