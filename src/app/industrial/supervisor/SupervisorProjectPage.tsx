import { Navigate, useParams } from 'react-router-dom';

import {
  isInternalProjectId,
  resolveProjectIdentity,
} from '@/core/projects/projectIdentity';

import IndustrialSupervisorDashboardPage from './index';

/**
 * /industrial/supervisor/:project — pré-selecciona o projecto no dashboard.
 */
export default function SupervisorProjectPage() {
  const { project } = useParams<{ project: string }>();
  const identity = project ? resolveProjectIdentity(project) : null;

  if (project && isInternalProjectId(project) && identity?.slug) {
    return <Navigate to={`/industrial/supervisor/${encodeURIComponent(identity.slug)}`} replace />;
  }

  if (!identity?.slug) {
    return <Navigate to="/industrial/supervisor" replace />;
  }

  return <IndustrialSupervisorDashboardPage initialProjectKey={identity.slug} />;
}
