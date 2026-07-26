/**
 * productAnnouncement.ts — Narrativa oficial Modelo B / PIMO.PRO-V5.0
 * Camada documental — não altera resultados industriais.
 */

import { PIMO_PRO_V5_VERSION } from "./finalVersioning";

/**
 * Texto de apresentação do Sistema de Gavetas Europeias (Modelo B)
 * incluído no release final PIMO.PRO-V5.0.
 */
export const MODELO_B_PRODUCT_ANNOUNCEMENT = `## Sistema de Gavetas Europeias — Modelo B

O novo Sistema de Gavetas Europeias (Modelo B) traz ao PIMO Criativo um conjunto completo de funcionalidades industriais:

### Estrutura Industrial Completa
- Frente, laterais, costa e fundo com medidas industriais
- Integração total com geometry, furos e cutlist
- Compatível com todos os módulos da Kitchen Library

### Overlay Industrial Avançado
- Medidas internas úteis
- Aberturas industriais (frontal, lateral, superior, inferior)
- Gaps industriais mínimos
- Remates e roda-pé integrados

### Documentação Técnica
- Vistas frontal, lateral e superior
- DXF industrial (CUT, DRILLING, DIMENSIONS)
- CNC físico (cnc/xml/mpr/cix/bpp)
- Relatórios técnicos e industriais

### Motor de Custo Industrial
- Custo de materiais (m²)
- Operações industriais
- CNC (CUT/DRILL)
- Montagem e mão de obra
- Overhead e margem
- Preço final por gaveta e por módulo

### Integração com Kitchen Library
- Gavetas europeias disponíveis para todos os módulos base, altos, superiores e canto
- Compatível com regras industriais de montagem

### Kitchen Planner (modo cliente)
- Inserção de gavetas nos módulos
- Medidas internas e aberturas visíveis
- Preço em tempo real
- Exportação de layout, vistas, DXF e CNC

---

Este sistema faz parte do **${PIMO_PRO_V5_VERSION} — Release Final**, trazendo ao PIMO Criativo um nível industrial completo para produção real.
`;

export function getModeloBProductAnnouncement(): string {
  return MODELO_B_PRODUCT_ANNOUNCEMENT;
}
