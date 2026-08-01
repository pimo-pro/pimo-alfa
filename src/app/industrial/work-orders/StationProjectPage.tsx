import { Navigate, useParams } from 'react-router-dom';

import { resolveProjectIdentity } from '@/core/projects/projectIdentity';
import { INDUSTRIAL_STATIONS, type IndustrialStation } from '@/industrial/work-orders/types';

import StationPageShell from './components/StationPageShell';

function isStation(value: string | undefined): value is IndustrialStation {
  return !!value && (INDUSTRIAL_STATIONS as readonly string[]).includes(value);
}

/**
 * Estação filtrada por projecto:
 * /industrial/work-orders/{station}/{project}
 */
export default function StationProjectPage() {
  const { station, project } = useParams<{ station: string; project: string }>();

  if (!isStation(station)) {
    return <Navigate to="/industrial/work-orders" replace />;
  }

  const identity = project ? resolveProjectIdentity(project) : null;
  if (!project?.trim() || !identity?.slug) {
    return <Navigate to={`/industrial/work-orders/${station}`} replace />;
  }

  return <StationPageShell station={station} projectSlug={identity.slug} />;
}
