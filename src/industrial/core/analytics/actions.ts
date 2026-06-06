import { getAnalyticsStats } from './stats';

export async function getAnalyticsOverview() {
  return getAnalyticsStats();
}
