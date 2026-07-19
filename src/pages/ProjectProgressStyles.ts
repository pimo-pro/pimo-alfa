/**
 * أنماط صفحة تقدم المشروع (Project Progress)
 */

export const projectProgressStyles = {
  main: {
    flex: 1,
    overflowY: "auto" as const,
    background: "radial-gradient(circle at top, var(--workspace-gradient-start, #1e293b), var(--workspace-gradient-end, #0b0f17) 60%)",
    color: "var(--text-main, #e2e8f0)",
    padding: "2rem",
    direction: "ltr" as const,
  },

  header: {
    marginBottom: "3rem",
    background: "linear-gradient(135deg, var(--bg-selected, rgba(59, 130, 246, 0.1)) 0%, rgba(139, 92, 246, 0.1) 100%)",
    padding: "2.5rem",
    borderRadius: "12px",
    border: "1px solid var(--border-selected, rgba(59, 130, 246, 0.2))",
  },

  headerContent: {
    marginBottom: "2rem",
  },

  title: {
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "var(--text-main, #f1f5f9)",
    margin: "0 0 0.5rem 0",
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  },

  subtitle: {
    fontSize: "1.1rem",
    color: "var(--text-muted, #cbd5e1)",
    margin: 0,
    fontWeight: 500,
  },

  statsContainer: {
    display: "grid" as const,
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },

  statBox: {
    background: "var(--card-bg, rgba(15, 23, 42, 0.6))",
    padding: "1.25rem",
    borderRadius: "10px",
    border: "1px solid var(--card-border, rgba(100, 116, 139, 0.2))",
    textAlign: "center" as const,
    backdropFilter: "blur(10px)",
  },

  statNumber: {
    fontSize: "2rem",
    fontWeight: 700,
    marginBottom: "0.5rem",
  },

  statLabel: {
    fontSize: "0.85rem",
    color: "var(--text-muted, #94a3b8)",
    fontWeight: 500,
  },

  progressBar: {
    height: "8px",
    background: "var(--progress-track-bg, rgba(100, 116, 139, 0.2))",
    borderRadius: "4px",
    overflow: "hidden" as const,
    border: "1px solid var(--card-border, rgba(100, 116, 139, 0.3))",
  },

  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, var(--blue-light, #3b82f6), #8b5cf6, var(--status-done-color, #22c55e))",
    borderRadius: "4px",
    transition: "width 0.5s ease",
  },

  sectionsContainer: {
    display: "grid" as const,
    gridTemplateColumns: "1fr",
    gap: "1.5rem",
    marginBottom: "3rem",
  },

  sectionCard: {
    background: "var(--card-bg, rgba(30, 41, 59, 0.4))",
    border: "1px solid var(--card-border, rgba(100, 116, 139, 0.15))",
    borderRadius: "12px",
    padding: "1.75rem",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s ease",
  },

  sectionHeader: {
    marginBottom: "1.5rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid var(--divider, rgba(100, 116, 139, 0.1))",
  },

  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "var(--text-main, #f1f5f9)",
    margin: "0 0 0.5rem 0",
  },

  sectionDesc: {
    fontSize: "0.95rem",
    color: "var(--text-muted, #cbd5e1)",
    margin: 0,
  },

  itemsList: {
    display: "grid" as const,
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1rem",
  },

  item: {
    padding: "1.25rem",
    borderRadius: "8px",
    borderLeft: "4px solid",
    background: "var(--card-bg, rgba(15, 23, 42, 0.5))",
    transition: "all 0.3s ease",
  },

  itemContent: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "0.5rem",
  },

  itemLabel: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-main, #f1f5f9)",
  },

  itemStatus: {
    fontSize: "0.8rem",
    fontWeight: 600,
  },

  changelogSection: {
    background: "var(--card-bg, rgba(30, 41, 59, 0.4))",
    border: "1px solid var(--card-border, rgba(100, 116, 139, 0.15))",
    borderRadius: "12px",
    padding: "2rem",
    marginBottom: "3rem",
    backdropFilter: "blur(10px)",
  },

  changelogTitle: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "var(--text-main, #f1f5f9)",
    margin: "0 0 1.5rem 0",
  },

  changelogList: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "1rem",
    maxHeight: "400px",
    overflowY: "auto" as const,
  },

  changelogItem: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "0.5rem",
    padding: "1rem",
    background: "var(--card-bg, rgba(15, 23, 42, 0.5))",
    borderLeft: "3px solid rgba(139, 92, 246, 0.5)",
    borderRadius: "6px",
  },

  changelogTime: {
    fontSize: "0.8rem",
    color: "var(--text-muted, #94a3b8)",
    fontWeight: 500,
  },

  changelogMessage: {
    fontSize: "0.95rem",
    color: "var(--text-muted, #cbd5e1)",
  },

  noChangelog: {
    textAlign: "center" as const,
    color: "var(--text-muted, #64748b)",
    padding: "2rem",
    fontSize: "0.95rem",
  },

  footerInfo: {
    display: "grid" as const,
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem",
  },

  infoBox: {
    background: "var(--bg-selected, rgba(59, 130, 246, 0.1))",
    border: "1px solid var(--border-selected, rgba(59, 130, 246, 0.2))",
    borderRadius: "10px",
    padding: "1.5rem",
    backdropFilter: "blur(10px)",
  },

  infoTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-main, #f1f5f9)",
    margin: "0 0 1rem 0",
  },

  infoText: {
    fontSize: "0.95rem",
    color: "var(--text-muted, #cbd5e1)",
    lineHeight: 1.6,
    margin: 0,
  },
};
