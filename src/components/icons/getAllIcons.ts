import { ThemeIconSun } from './header/ThemeIconSun';
import { ThemeIconMoon } from './header/ThemeIconMoon';
import { IconUser } from './header/IconUser';
import { IconUpload } from './header/IconUpload';
import { IconProjects } from './header/IconProjects';
import { IconSettings } from './header/IconSettings';
import { IconMaterials } from './admin/IconMaterials';
import { IconManagement } from './admin/IconManagement';
import { IconHardware } from './admin/IconHardware';
import { IconUndo } from './admin/IconUndo';
import { IconRedo } from './admin/IconRedo';
import { IconDuplicate } from './admin/IconDuplicate';
import { IconWood } from './admin/IconWood';
import { IconClipboard } from './admin/IconClipboard';
import { IconPuzzle } from './admin/IconPuzzle';
import { IconRuler } from './admin/IconRuler';
import { IconBooks } from './admin/IconBooks';
import { IconPalette } from './admin/IconPalette';
import { IconFolder } from './admin/IconFolder';
import { IconFile } from './admin/IconFile';
import { IconFlask } from './admin/IconFlask';
import { IconTag } from './admin/IconTag';
import { IconSave } from './admin/IconSave';
import { IconChartUp } from './admin/IconChartUp';
import { IconBookOpen } from './admin/IconBookOpen';
import { IconProject } from './toolbar/IconProject';
import { IconNew } from './toolbar/IconNew';
import { IconViewer } from './viewer/IconViewer';
import { IconWhatsApp } from './misc/IconWhatsApp';

export const allIcons = {
  // Header
  ThemeIconSun,
  ThemeIconMoon,
  IconUser,
  IconUpload,
  IconProjects,
  IconSettings,
  // Admin
  IconMaterials,
  IconManagement,
  IconHardware,
  IconUndo,
  IconRedo,
  IconDuplicate,
  IconWood,
  IconClipboard,
  IconPuzzle,
  IconRuler,
  IconBooks,
  IconPalette,
  IconFolder,
  IconFile,
  IconFlask,
  IconTag,
  IconSave,
  IconChartUp,
  IconBookOpen,
  // Toolbar
  IconProject,
  IconNew,
  // Viewer
  IconViewer,
  // Misc
  IconWhatsApp,
} as const;

export type IconName = keyof typeof allIcons;

export const iconSections = {
  header: ['ThemeIconSun', 'ThemeIconMoon', 'IconUser', 'IconUpload', 'IconProjects', 'IconSettings'] as IconName[],
  admin: [
    'IconMaterials',
    'IconManagement',
    'IconHardware',
    'IconUndo',
    'IconRedo',
    'IconDuplicate',
    'IconWood',
    'IconClipboard',
    'IconPuzzle',
    'IconRuler',
    'IconBooks',
    'IconPalette',
    'IconFolder',
    'IconFile',
    'IconFlask',
    'IconTag',
    'IconSave',
    'IconChartUp',
    'IconBookOpen',
  ] as IconName[],
  toolbar: ['IconProject', 'IconNew'] as IconName[],
  viewer: ['IconViewer'] as IconName[],
  misc: ['IconWhatsApp'] as IconName[],
} as const;