export type AppTopBarKind = 'navbar' | 'trak' | 'none';

export type AppChromeConfig = {
  /** Header PIMO-PRO (PiMo Studio) do AppChromeLayout — sempre true. */
  showProHeader: boolean;
  /** Barra secundária: Navbar, TopBar TRK, ou nenhuma (abaixo do Header). */
  topBar: AppTopBarKind;
};

/**
 * Chrome por módulo.
 * Header PRO + Footer estão sempre no AppChromeLayout.
 * TopBarTrak / Navbar ficam ABAIXO do Header, nunca em substituição.
 */
export function resolveAppChrome(pathname: string): AppChromeConfig {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/PROJETOS' || path.startsWith('/PROJETOS/')) {
    return { showProHeader: true, topBar: 'none' };
  }

  if (path === '/industrial' || path.startsWith('/industrial/')) {
    return { showProHeader: true, topBar: 'trak' };
  }

  return { showProHeader: true, topBar: 'navbar' };
}
