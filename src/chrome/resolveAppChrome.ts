export type AppTopBarKind = 'navbar' | 'trak' | 'none';

export type AppChromeConfig = {
  /** Header PIMO-PRO (PiMo Studio) do AppChromeLayout. */
  showProHeader: boolean;
  /** Barra superior: Navbar global, TopBar TRK, ou nenhuma. */
  topBar: AppTopBarKind;
};

/**
 * Resolve o chrome (cabeçalhos) por pathname — um cabeçalho por módulo.
 * - PIMO-PROJETOS ? nenhum
 * - PIMO-TRAK / industrial ? TopBarTrak (sem Header PRO)
 * - resto sob AppChromeLayout ? Header PRO + Navbar (quando ProtectedLayout)
 */
export function resolveAppChrome(pathname: string): AppChromeConfig {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/PROJETOS' || path.startsWith('/PROJETOS/')) {
    return { showProHeader: false, topBar: 'none' };
  }

  if (path === '/industrial' || path.startsWith('/industrial/')) {
    return { showProHeader: false, topBar: 'trak' };
  }

  return { showProHeader: true, topBar: 'navbar' };
}
