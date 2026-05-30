/**
 * PIMO Criativo — Página de Ajuda
 * Conteúdo baseado em: howItWorks.ts, specs.ts, features.ts, projectProgress
 * Língua: PT-PT | Tema: dark navy
 * Sem lógica industrial.
 */

import { useState } from "react";

// ── Tokens ────────────────────────────────────────────────────────────────────

const C = {
  bg:      "var(--navy,#0f172a)",
  surface: "var(--card-bg,rgba(255,255,255,0.03))",
  border:  "var(--card-border,rgba(255,255,255,0.07))",
  text:    "var(--text-main,#e2e8f0)",
  muted:   "var(--text-muted,#94a3b8)",
  accent:  "#3b82f6",
  green:   "#34d399",
  amber:   "#fbbf24",
  purple:  "#a78bfa",
  pink:    "#f472b6",
  danger:  "#f85149",
};

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

// ── SVG ───────────────────────────────────────────────────────────────────────

const P: Record<string,string> = {
  box:    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  move:   "M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20",
  mat:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  door:   "M3 3h7v18H3zM10 7l4-4h7v18h-7l-4-4",
  drawer: "M2 8h20v8H2zM6 8v8M12 8v8M18 8v8",
  shelf:  "M4 12h16M4 6h16M4 18h16",
  cut:    "M14.5 4l-5 16M4 6l16 12M4 18l16-12",
  export: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  grid:   "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  ruler:  "M2 12h20M6 8l-4 4 4 4M18 8l4 4-4 4",
  info:   "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01",
  warn:   "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  key:    "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3",
  tag:    "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  check:  "M20 6L9 17l-5-5",
  gear:   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

function Ico({ d, size=16, color="currentColor" }: { d:string; size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type AlertType = "tip" | "warning" | "best-practice";

interface Alert { type: AlertType; text: string; }
interface Step  { title: string; text: string; code?: string; }
interface Section {
  id: string; icon: string; label: string; accent: string;
  title: string; intro: string;
  steps: Step[];
  alerts?: Alert[];
  subsections?: { title: string; steps: Step[]; alerts?: Alert[] }[];
}

// ── Conteúdo ──────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id:"criar-caixa", icon:"box", label:"Criar Caixa", accent:C.accent,
    title:"Criar e configurar uma nova caixa",
    intro:"O PIMO usa um sistema de placeholders (workspaceBoxes) — primeiro posiciona as caixas no workspace, depois clica em 'Gerar Design 3D' para calcular a estrutura completa.",
    steps:[
      { title:"Abrir o painel Móveis", text:"Clique no ícone de Móveis na barra lateral esquerda (segundo ícone). Surge a lista de módulos agrupados por categoria: Cozinha Base, Cozinha Superior, PI Models, Roupeiro." },
      { title:"Escolher e configurar o módulo", text:"Clique num item para abrir o painel flutuante à direita. Vê a pré-visualização 3D do módulo com as dimensões reais. Configure as opções antes de adicionar." },
      { title:"Definir opções: Pés, Porta, Gavetas, Prateleiras", text:"No painel flutuante: ative 'Pés' (adiciona 100mm à altura base), escolha tipo de porta (Sem porta / Simples / Dupla), defina número de gavetas (0-4) e prateleiras (0-5)." },
      { title:"Adicionar ao projeto", text:"Clique em '+ Adicionar ao projeto'. A caixa aparece no viewport como placeholder. Pode adicionar múltiplos módulos seguidos sem sair do painel Móveis." },
      { title:'Clicar em "Gerar Design 3D"', text:"Este é o passo crítico: converte todos os placeholders em BoxModules completos. O sistema calcula painéis, ferragens, furação e custos. O 3D é montado a partir da estrutura calculada." },
    ],
    alerts:[
      { type:"tip",          text:'Pode adicionar múltiplos módulos seguidos sem sair do painel Móveis — o sistema mantém a aba ativa.' },
      { type:"best-practice",text:'Configure todas as caixas antes de clicar "Gerar Design 3D" — o cálculo é feito para todo o projeto de uma vez.' },
      { type:"warning",      text:'Gavetas e portas não podem coexistir na mesma caixa. Ao adicionar gavetas, as portas são automaticamente removidas.' },
    ],
  },
  {
    id:"workspace-mover", icon:"move", label:"Mover e Posicionar", accent:C.purple,
    title:"Mover, rodar e posicionar módulos no workspace",
    intro:"O workspace é a área central onde posiciona os módulos antes do cálculo. Use as ferramentas da barra do viewer (barra horizontal acima do viewport 3D).",
    steps:[
      { title:"Selecionar um módulo (S)", text:"Clique no módulo no viewport 3D. Fica destacado com borda azul. Em alternativa, prima S para ativar a ferramenta de seleção." },
      { title:"Mover nos eixos (M)", text:"Prima M ou clique no ícone de seta cruzada. Surge o gizmo de translação: eixo X (vermelho) para horizontal, eixo Z (azul) para profundidade. Shift+drag bloqueia o eixo Z." },
      { title:"Rodar o módulo (R)", text:"Prima R ou clique no ícone de rotação. Arraste para rodar em torno do eixo Y (vertical). Útil para posicionar módulos em cantos ou parede oposta." },
      { title:"Alinhar pela frente (botão direito)", text:"Clique com o botão direito no módulo → 'Alinhar pela frente do box ao lado'. Alinha a frente (eixo Z) com o módulo vizinho mais próximo." },
      { title:"Auto-posicionamento", text:"O PIMO tem auto-layout: módulos adicionados são posicionados automaticamente lado a lado. Se preferir controlo manual, mova a caixa após adicionar — fica em modo 'posição manual'." },
    ],
    alerts:[
      { type:"tip",    text:"Prima Home para repor a câmara à posição padrão. Prima Escape para cancelar a seleção." },
      { type:"tip",    text:"O sistema deteta colisões entre módulos e mostra avisos no painel inferior (LayoutWarnings)." },
    ],
  },
  {
    id:"materials", icon:"mat", label:"Materiais", accent:C.green,
    title:"Alterar materiais da carcaça e frentes",
    intro:"Cada caixa pode ter material diferente para a carcaça (painéis estruturais) e para as frentes (portas e gavetas). A biblioteca de materiais inclui espessura padrão e custo por m².",
    steps:[
      { title:"Selecionar a caixa", text:"Clique na caixa no viewport ou no painel lateral esquerdo." },
      { title:"Abrir o separador Modelos", text:"Clique no ícone 'Modelos' na barra lateral. Vê a secção 'Material da Carcaça' com a lista de materiais disponíveis." },
      { title:"Escolher material da carcaça", text:"Selecione da lista (ex.: MDF Branco 19, Carvalho Natural, Nogueira). O viewer 3D atualiza em tempo real com o material PBR correto." },
      { title:"Material da frente (portas/gavetas)", text:"Clique com o botão direito na porta ou gaveta no viewport → 'Alterar material da porta' ou 'Alterar material da gaveta'. Permite frente diferente da carcaça." },
      { title:"Custo do material", text:"O resumo financeiro atualiza automaticamente: custo por m² × área total dos painéis desse material." },
    ],
    alerts:[
      { type:"best-practice", text:"Defina o material antes de gerar o design 3D — o cálculo de custo usa o material configurado." },
      { type:"tip",           text:"Materiais adicionados pelo admin ficam disponíveis para todos os projetos. Aceda ao Admin Panel para gerir a biblioteca." },
    ],
  },
  {
    id:"portas-gavetas", icon:"door", label:"Portas e Gavetas", accent:C.amber,
    title:"Configurar portas, gavetas e frentes",
    intro:"O sistema de layers (camadas) do PIMO gera automaticamente a geometria 3D de portas e gavetas com base nas regras industriais de folgas, dobradiças e corrediças.",
    steps:[
      { title:"Tipos de porta disponíveis", text:"Sem porta / Porta simples (uma folha, abertura esquerda ou direita) / Porta dupla (duas folhas, abertura para os lados). O sistema calcula automaticamente o número de dobradiças e as folgas." },
      { title:"Adicionar porta ao módulo selecionado", text:"Com a caixa selecionada, no painel esquerdo em 'Tipo de Porta' escolha Simples ou Dupla. A porta aparece imediatamente no viewer." },
      { title:"Abrir e fechar a porta (animação)", text:"Clique na porta no viewport para a animar. A abertura é calculada com as dobradiças reais — útil para verificar interferências com módulos adjacentes." },
      { title:"Gavetas: número e alturas", text:"Defina o número de gavetas (1-4). As alturas são distribuídas automaticamente respeitando as regras mínimas. O sistema calcula corrediças, recuos e dimensões do corpo interno." },
      { title:"Regras automáticas aplicadas", text:"Ao escolher gavetas: porta removida automaticamente. Ao escolher porta dupla em caixa estreita: aviso de largura mínima. Todas as folgas industriais são aplicadas sem intervenção." },
    ],
    alerts:[
      { type:"warning",      text:"Gavetas e portas são mutuamente exclusivas na mesma caixa. O sistema aplica esta regra automaticamente." },
      { type:"best-practice",text:"Para verificar colisões de abertura de porta com módulos adjacentes, use a animação de abertura antes de exportar." },
      { type:"tip",          text:"A lista de ferragens (dobradiças e corrediças) é gerada automaticamente com base nas configurações definidas." },
    ],
  },
  {
    id:"medicoes", icon:"ruler", label:"Medições e Cotas", accent:C.pink,
    title:"Medições, régua e cotas no viewport",
    intro:"A ferramenta de medição mostra as dimensões reais de cada módulo como etiquetas sobrepostas no viewer 3D. Útil para verificar dimensões antes de exportar.",
    steps:[
      { title:"Ativar medições (D)", text:"Prima D ou clique no ícone de régua na barra do viewer. As etiquetas surgem no módulo selecionado: L (largura, azul), A (altura, verde), P (profundidade, roxo)." },
      { title:"Interpretar os valores", text:"Os valores são em centímetros (ex.: L 80 cm = 800mm). Correspondem às dimensões externas da caixa conforme configurado." },
      { title:"Mudar de módulo", text:"Ao clicar noutro módulo, as etiquetas atualizam automaticamente para as dimensões desse módulo." },
      { title:"Régua manual (medição entre pontos)", text:"No painel de Medições Internas (botão na barra inferior), pode criar medições entre dois pontos específicos da cena — útil para verificar espaços e alinhamentos." },
      { title:"Desativar", text:"Prima D novamente ou clique no ícone de régua. As etiquetas desaparecem." },
    ],
    alerts:[
      { type:"tip", text:"As cotas mostradas são as dimensões externas do módulo. As dimensões internas (dos painéis) são calculadas internamente e visíveis na lista de corte." },
    ],
  },
  {
    id:"lista-corte", icon:"cut", label:"Lista de Corte", accent:C.green,
    title:"Gerar e interpretar a lista de corte",
    intro:"A lista de corte (cutlist) é gerada automaticamente após 'Gerar Design 3D'. Contém todas as peças do projeto com dimensões exatas em milímetros, prontas para o operador CNC.",
    steps:[
      { title:"Aceder à lista de corte", text:"Na barra inferior do workspace, clique em 'Cutlist' ou 'Lista de Corte'. Vê todas as peças organizadas por módulo." },
      { title:"Interpretar cada linha", text:"Cada linha mostra: Nome da peça (ex.: LAT ESQ, TAMPO, COSTA), Comprimento × Largura × Espessura em mm, Material e Custo unitário." },
      { title:"Painéis estruturais incluídos", text:"Lateral esquerda e direita, tampo, fundo, costa (10mm fixo) e prateleiras. Altura das laterais = altura total − (tampo + fundo). Dimensões incluem todas as folgas industriais." },
      { title:"Peças de frente (portas/gavetas)", text:"As frentes das portas e gavetas aparecem separadas dos painéis estruturais. Podem ter material diferente da carcaça." },
      { title:"Ferragens associadas", text:"No separador 'Ferragens' (junto à lista de corte) vê a lista automática: dobradiças, corrediças, suportes de prateleira e cavilhas por módulo." },
    ],
    alerts:[
      { type:"best-practice", text:'Só clicar em "Gerar Design 3D" depois de todas as caixas estarem configuradas — a lista de corte reflete o estado no momento do cálculo.' },
      { type:"tip",           text:"O módulo de nesting (layout de corte) mostra como distribuir as peças nas chapas para minimizar desperdício." },
    ],
  },
  {
    id:"nesting", icon:"grid", label:"Nesting / Layout de Corte", accent:C.purple,
    title:"Nesting e optimização do layout de corte",
    intro:"O módulo de Layout de Corte distribui automaticamente as peças nas chapas disponíveis, minimizando o desperdício de material. Disponível em dois modos.",
    steps:[
      { title:"Aceder ao Layout de Corte", text:"Na barra inferior, clique em 'Layout de Corte' ou 'Nesting'. Vê as chapas com as peças distribuídas visualmente." },
      { title:"Modo Fast", text:"Algoritmo rápido para estimativas. Distribui as peças de forma eficiente sem garantir o resultado ótimo. Ideal para orçamentação rápida." },
      { title:"Modo PRO", text:"Algoritmo otimizado que minimiza o desperdício de material. Considera rotação de 90° das peças para melhor aproveitamento. Recomendado para produção real." },
      { title:"Interpretar o resultado", text:"Cada chapa mostra: peças posicionadas com identificação, área útil usada, percentagem de desperdício e número de chapas necessárias." },
      { title:"Notas sobre furação", text:"Atenção: a rotação de peças no layout PRO pode afetar a orientação dos furos CNC. Verifique sempre o plano de furação antes de enviar para máquina." },
    ],
    alerts:[
      { type:"warning",      text:"Se uma peça for rotacionada 90° no layout PRO, o plano de furação deve ser ajustado manualmente — esta limitação está documentada no sistema." },
      { type:"best-practice",text:"Use o modo PRO apenas para produção final. Para estimativas de custo e material, o modo Fast é suficiente e mais rápido." },
    ],
  },
  {
    id:"exportacao", icon:"export", label:"Exportação", accent:C.accent,
    title:"Exportar ficheiros de produção",
    intro:"O PIMO gera todos os artefactos técnicos necessários para a produção. Cada tipo de exportação serve uma finalidade específica no fluxo industrial.",
    subsections:[
      {
        title:"PDF Técnico",
        steps:[
          { title:"O que inclui", text:"Imagem 3D do projeto, lista de corte completa, resumo de materiais, lista de ferragens e preço total. Formato profissional para apresentar ao cliente ou arquivo de projeto." },
          { title:"Como exportar", text:"Barra superior → botão 'Exportar' → 'PDF Técnico'. O ficheiro é gerado no browser e descarregado automaticamente." },
        ],
      },
      {
        title:"CNC / TCN",
        steps:[
          { title:"O que é o formato TCN", text:"Formato padrão para centros de furação CNC (compatível com Biesse, Homag, SCM e similares). Contém a posição exata de cada furo: diâmetro, profundidade, coordenadas X/Y por painel." },
          { title:"Como exportar", text:"Botão 'Exportar' → 'CNC/TCN'. O sistema gera um ficheiro por módulo. Inclui furação de cavilhas (32mm), corrediças, dobradiças e suportes de prateleira." },
        ],
        alerts:[
          { type:"warning", text:"O ficheiro TCN inclui furação de cavilhas com offset de 9.5mm. Para chapas com espessura diferente de 19mm, verifique o offset antes de maquinar." },
        ],
      },
      {
        title:"Drill XML",
        steps:[
          { title:"O que é o Drill XML", text:"Formato XML estruturado com o plano completo de furação. Mais legível que o TCN e compatível com software de importação personalizado." },
          { title:"Como exportar", text:"Botão 'Exportar' → 'Drill XML'. Um ficheiro por módulo com toda a informação de furação em estrutura hierárquica." },
        ],
      },
      {
        title:"Pacote ZIP completo",
        steps:[
          { title:"O que inclui", text:"PDF técnico + lista de corte CSV + ficheiros CNC/TCN + Drill XML + etiquetas de rastreio — tudo num único ficheiro ZIP." },
          { title:"Como exportar", text:"Botão 'Exportar' → 'Pacote Completo (ZIP)'. Recomendado para enviar para produção: o operador recebe tudo num só ficheiro." },
        ],
        alerts:[
          { type:"best-practice", text:"Use o pacote ZIP como entregável padrão para a fábrica — garante que nenhum ficheiro falta." },
        ],
      },
    ],
    steps:[],
    alerts:[
      { type:"tip", text:'Todos os ficheiros de exportação são gerados em segundos diretamente no browser — sem servidores externos.' },
    ],
  },
  {
    id:"rastreio", icon:"tag", label:"PIMO-TRAK", accent:C.amber,
    title:"Rastreio de peças com PIMO-TRAK",
    intro:"O PIMO-TRAK gera etiquetas com QR code único por peça do projeto. Permite rastrear o estado de cada peça ao longo de todas as fases de produção.",
    steps:[
      { title:"Gerar etiquetas de rastreio", text:"Botão 'Exportar' → 'Etiquetas PDF'. O sistema cria uma etiqueta por peça com QR code, nome do projeto, nome da peça e dimensões." },
      { title:"Imprimir as etiquetas", text:"Etiquetas em formato A4 (múltiplas por página) ou folha de autocolantes. Imprima diretamente do browser após abertura do PDF." },
      { title:"Colar na peça após o corte", text:"Cole a etiqueta na peça imediatamente após o corte CNC. O QR code vincula fisicamente a peça ao projeto digital." },
      { title:"Registar o estado em cada fase", text:"Digitalize o QR code em cada posto de trabalho (corte, furação, lacagem, montagem) para atualizar o estado da peça no sistema PIMO-TRAK." },
      { title:"Consultar estado do projeto", text:"No PIMO-TRAK, qualquer colaborador com acesso pode ver o estado de cada peça e do projeto completo em tempo real." },
    ],
    alerts:[
      { type:"tip",          text:"O QR code é único por peça e por projeto — mesmo peças com as mesmas dimensões têm códigos diferentes." },
      { type:"best-practice",text:"Cole as etiquetas antes de mover as peças da mesa de corte — evita confusões entre peças semelhantes." },
    ],
  },
  {
    id:"projetos", icon:"gear", label:"Gerir Projetos", accent:C.green,
    title:"Guardar, carregar e gerir projetos",
    intro:"O PIMO guarda projetos automaticamente em localStorage (navegador local). Pode também guardar manualmente e carregar projetos anteriores.",
    steps:[
      { title:"Guardar o projeto", text:"O PIMO guarda automaticamente o estado do projeto em intervalos regulares. Para guardar manualmente: barra superior → botão 'Guardar' (ícone de disquete)." },
      { title:"Aceder a projetos guardados", text:"Barra superior → 'Meus Projetos' (ícone de pasta). Lista todos os projetos guardados com data, dimensões e miniatura." },
      { title:"Carregar um projeto", text:"Em 'Meus Projetos', clique no projeto desejado → 'Abrir'. O workspace é restaurado com todos os módulos, materiais e configurações." },
      { title:"Duplicar ou renomear", text:"Clique com o botão direito num projeto → 'Duplicar' para criar uma cópia ou 'Renomear' para alterar o nome." },
      { title:"Exportar e importar projetos", text:"Use 'Exportar Projeto (JSON)' para guardar o ficheiro fora do browser. Útil para partilhar com colegas ou fazer backup externo." },
    ],
    alerts:[
      { type:"warning",      text:"Os projetos estão guardados no localStorage do browser. Se limpar os dados do browser, os projetos são apagados. Use 'Exportar Projeto (JSON)' para backup externo." },
      { type:"best-practice",text:"Dê sempre um nome descritivo ao projeto (ex.: 'Cozinha_JoaoSilva_2026') para facilitar a pesquisa em 'Meus Projetos'." },
    ],
  },
  {
    id:"atalhos", icon:"key", label:"Atalhos de Teclado", accent:"#94a3b8",
    title:"Atalhos de teclado do viewport",
    intro:"O viewport 3D tem atalhos para as ações mais frequentes. Memorizar os principais acelera significativamente o fluxo de trabalho.",
    steps:[
      { title:"S — Selecionar",     text:"Ativa a ferramenta de seleção. Clique num módulo para o selecionar e ver as propriedades no painel esquerdo." },
      { title:"M — Mover",          text:"Ativa o gizmo de translação no módulo selecionado. Arraste nos eixos X (horizontal) ou Z (profundidade)." },
      { title:"R — Rodar",          text:"Ativa o gizmo de rotação. Arraste para rodar em torno do eixo Y (vertical)." },
      { title:"D — Cotas",          text:"Mostra/oculta as etiquetas de dimensão sobrepostas no módulo selecionado (L, A, P em centímetros)." },
      { title:"G — Grelha",         text:"Mostra ou oculta a grelha do chão no viewport." },
      { title:"Home — Câmara",      text:"Repõe a câmara à posição isométrica padrão." },
      { title:"Escape — Cancelar",  text:"Cancela a seleção ativa e volta à ferramenta de seleção." },
      { title:"Ctrl+Z — Desfazer",  text:"Desfaz a última ação no projeto (move, configuração de material, etc.)." },
      { title:"Ctrl+Y — Refazer",   text:"Refaz a última ação desfeita." },
      { title:"Botão direito",      text:"Abre o menu de contexto no módulo clicado: Duplicar, Renomear, Bloquear, Alinhar, Alterar material, Remover." },
    ],
    alerts:[
      { type:"tip", text:"O menu de contexto (botão direito) no viewport é o acesso mais rápido às ações por módulo. Explore todas as opções disponíveis." },
    ],
  },
];

// ── Componentes internos ──────────────────────────────────────────────────────

function Kbd({ label }: { label: string }) {
  return (
    <kbd style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:28,padding:"2px 7px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderBottom:"2px solid rgba(255,255,255,0.1)",borderRadius:5,fontSize:11,fontWeight:600,fontFamily:"monospace",color:C.text,flexShrink:0 }}>
      {label}
    </kbd>
  );
}

const ALERT_CFG: Record<AlertType,{ color:string; icon:string; label:string }> = {
  tip:           { color:C.accent,  icon:P.info, label:"Dica"           },
  warning:       { color:C.amber,   icon:P.warn, label:"Atenção"        },
  "best-practice":{ color:C.green, icon:P.star, label:"Boa prática"    },
};

function AlertBox({ type, text }: Alert) {
  const cfg = ALERT_CFG[type];
  return (
    <div style={{ display:"flex",gap:9,padding:"9px 12px",background:`${cfg.color}0f`,border:`1px solid ${cfg.color}2a`,borderRadius:8 }}>
      <Ico d={cfg.icon} size={13} color={cfg.color}/>
      <p style={{ margin:0,fontSize:12,color:C.muted,lineHeight:1.6,fontFamily:font }}>
        <strong style={{ color:cfg.color }}>{cfg.label}: </strong>{text}
      </p>
    </div>
  );
}

function StepList({ steps, alerts }: { steps:Step[]; alerts?:Alert[] }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
      {steps.map((step,i)=>(
        <div key={i} style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
          <div style={{ width:24,height:24,borderRadius:"50%",flexShrink:0,background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.accent }}>{i+1}</div>
          <div>
            <p style={{ margin:"1px 0 3px",fontSize:13,fontWeight:600,color:C.text,fontFamily:font }}>{step.title}</p>
            <p style={{ margin:0,fontSize:12,color:C.muted,lineHeight:1.65,fontFamily:font }}>{step.text}</p>
            {step.code&&<code style={{ display:"block",marginTop:6,padding:"5px 9px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,fontSize:11,color:C.accent,fontFamily:"monospace" }}>{step.code}</code>}
          </div>
        </div>
      ))}
      {alerts?.map((a,i)=><AlertBox key={i} {...a}/>)}
    </div>
  );
}

function SectionCard({ section, isActive }: { section:Section; isActive:boolean }) {
  const isShortcuts = section.id === "atalhos";
  return (
    <div id={section.id} style={{ background:C.surface,border:`1px solid ${isActive?section.accent+"44":C.border}`,borderRadius:14,overflow:"hidden",scrollMarginTop:80,transition:"border-color 0.2s" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:12,padding:"15px 20px",borderBottom:`1px solid ${C.border}`,background:"rgba(255,255,255,0.015)" }}>
        <div style={{ width:34,height:34,borderRadius:9,flexShrink:0,background:`${section.accent}18`,border:`1px solid ${section.accent}30`,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Ico d={P[section.icon]} size={15} color={section.accent}/>
        </div>
        <div>
          <p style={{ margin:0,fontSize:14,fontWeight:700,color:C.text,fontFamily:font }}>{section.title}</p>
          <p style={{ margin:0,fontSize:11,color:C.muted,fontFamily:font }}>{section.label}</p>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding:"18px 20px",display:"flex",flexDirection:"column",gap:16 }}>
        <p style={{ margin:0,fontSize:13,color:C.muted,lineHeight:1.65,fontFamily:font }}>{section.intro}</p>

        {isShortcuts ? (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:8 }}>
            {section.steps.map((step)=>{
              const [key,...rest] = step.title.split(" — ");
              return (
                <div key={step.title} style={{ display:"flex",alignItems:"flex-start",gap:9,padding:"9px 11px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:8 }}>
                  <Kbd label={key}/>
                  <div>
                    <p style={{ margin:"0 0 2px",fontSize:12,fontWeight:600,color:C.text,fontFamily:font }}>{rest.join(" — ")}</p>
                    <p style={{ margin:0,fontSize:11,color:C.muted,lineHeight:1.5,fontFamily:font }}>{step.text}</p>
                  </div>
                </div>
              );
            })}
            {section.alerts?.map((a,i)=><AlertBox key={i} {...a}/>)}
          </div>
        ) : section.subsections ? (
          <div style={{ display:"flex",flexDirection:"column",gap:22 }}>
            {section.subsections.map((sub)=>(
              <div key={sub.title}>
                <p style={{ margin:"0 0 12px",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:section.accent,fontFamily:font }}>{sub.title}</p>
                <StepList steps={sub.steps} alerts={sub.alerts}/>
              </div>
            ))}
            {section.alerts?.map((a,i)=><AlertBox key={i} {...a}/>)}
          </div>
        ) : (
          <StepList steps={section.steps} alerts={section.alerts}/>
        )}
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Ajuda() {
  const [active, setActive] = useState("criar-caixa");

  return (
    <div className="theme-dark" style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:font }}>
      <div style={{ maxWidth:1080,margin:"0 auto",padding:"0 20px 80px" }}>

        {/* Header */}
        <div style={{ padding:"48px 0 36px",borderBottom:`1px solid ${C.border}`,marginBottom:36 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginBottom:12,padding:"3px 10px",borderRadius:999,fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",background:"rgba(59,130,246,0.1)",color:C.accent,border:"1px solid rgba(59,130,246,0.25)" }}>Documentação</div>
          <h1 style={{ fontSize:"clamp(1.7rem,4vw,2.3rem)",fontWeight:800,margin:"0 0 10px",letterSpacing:"-0.02em" }}>Centro de Ajuda — PIMO Criativo</h1>
          <p style={{ fontSize:"0.98rem",color:C.muted,maxWidth:560,margin:0,lineHeight:1.6 }}>
            Guias passo a passo baseados no funcionamento real do sistema: do primeiro módulo ao ficheiro CNC.
          </p>
          {/* Quick stats */}
          <div style={{ display:"flex",gap:16,marginTop:20,flexWrap:"wrap" }}>
            {[["10 secções","cobrindo todo o fluxo",C.accent],["Baseado em","código real",C.green],["PT-PT","português europeu",C.purple]].map(([a,b,c])=>(
              <div key={a} style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.muted }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:c as string,flexShrink:0 }}/>
                <strong style={{ color:C.text }}>{a}</strong> — {b}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"198px 1fr",gap:28,alignItems:"start" }}>

          {/* Sidebar nav */}
          <nav style={{ position:"sticky",top:16,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"8px 6px" }}>
            <p style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:C.muted,padding:"4px 10px 8px",margin:0 }}>Conteúdo</p>
            {SECTIONS.map((s)=>(
              <a key={s.id} href={`#${s.id}`} onClick={()=>setActive(s.id)} style={{ display:"flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:7,fontSize:12,fontWeight:active===s.id?600:400,color:active===s.id?s.accent:C.muted,background:active===s.id?`${s.accent}12`:"transparent",border:`1px solid ${active===s.id?s.accent+"30":"transparent"}`,textDecoration:"none",transition:"all 0.1s",fontFamily:font }}>
                <Ico d={P[s.icon]} size={12} color={active===s.id?s.accent:C.muted}/>
                {s.label}
              </a>
            ))}
          </nav>

          {/* Content */}
          <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
            {SECTIONS.map((s)=><SectionCard key={s.id} section={s} isActive={active===s.id}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}
