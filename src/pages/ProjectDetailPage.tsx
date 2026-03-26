import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 200);
    return () => window.clearTimeout(timer);
  }, [id]);

  return (
    <PageContainer>
      <Card>
        <PageHeader title={`Projeto ${id}`} />
        {loading ? <Loader label={`Carregando projeto ${id}...`} /> : null}
        <p>Placeholder da FASE 4 (editor não implementado).</p>
      </Card>
    </PageContainer>
  );
}
