import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getProjects, type ProjectListItem } from "../api/projectsApi";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects()
      .then((result) => setProjects(result.projects ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar projetos"))
      .finally(() => setLoading(false));
  }, []);

  const safeProjects = projects ?? [];

  if (error) {
    return (
      <PageContainer>
        <Card className="ui-projects-shell">
          <PageHeader title="Projects" subtitle="Falha ao carregar dados do endpoint." />
          <Card>
            <p className="ui-text-danger">{error}</p>
          </Card>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card className="ui-projects-shell">
        <PageHeader title="Projects" subtitle="Lista de projetos visíveis para o utilizador atual." />
        <Section title="Tabela de projetos">
          <Card>
            {loading ? <Loader label="Carregando /projects..." /> : null}
            {!loading && safeProjects.length === 0 ? (
              <p className="ui-text-muted">Nenhum projeto visível para este utilizador.</p>
            ) : !loading ? (
              <table className="projects-table ui-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>title</th>
                    <th>slug</th>
                    <th>isPublic</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {safeProjects.map((project) => (
                    <tr key={project.id}>
                      <td>{project.id}</td>
                      <td>{project.title}</td>
                      <td>{project.slug}</td>
                      <td>{String(project.isPublic)}</td>
                      <td>
                        <Link to={`/projects/${project.id}`}>
                          <Button variant="outline">Detalhes</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Card>
        </Section>
      </Card>
    </PageContainer>
  );
}
