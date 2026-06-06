-- Criação das tabelas para o módulo de Workflow Engine

-- Tabela de regras de workflow
CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50) NOT NULL,
    event_type JSONB, -- Array de tipos de eventos que acionam a regra
    conditions JSONB NOT NULL, -- Condições da regra em formato JSON
    transitions JSONB NOT NULL, -- Transições da regra em formato JSON
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de transições de workflow (para armazenamento separado)
CREATE TABLE IF NOT EXISTS workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    from_state VARCHAR(100) NOT NULL,
    to_state VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    description TEXT,
    conditions JSONB, -- Condições da transição
    actions JSONB, -- Ações da transição
    auto_trigger BOOLEAN DEFAULT false,
    entity_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de execução de workflow
CREATE TABLE IF NOT EXISTS workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES workflow_rules(id) ON DELETE SET NULL,
    transition_id UUID REFERENCES workflow_transitions(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Tabela de estados de entidades (para controle de estado)
CREATE TABLE IF NOT EXISTS workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    current_state VARCHAR(100) NOT NULL,
    previous_state VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(entity_type, entity_id)
);

-- Tabela de estatísticas de workflow
CREATE TABLE IF NOT EXISTS workflow_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    rule_id UUID REFERENCES workflow_rules(id) ON DELETE CASCADE,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_execution TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_workflow_rules_entity_type ON workflow_rules(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_enabled ON workflow_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_priority ON workflow_rules(priority);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_created_at ON workflow_rules(created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_entity_type ON workflow_transitions(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_auto_trigger ON workflow_transitions(auto_trigger);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from_state ON workflow_transitions(from_state);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_to_state ON workflow_transitions(to_state);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_entity_type ON workflow_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_entity_id ON workflow_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_result ON workflow_logs(result);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created_at ON workflow_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_rule_id ON workflow_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_transition_id ON workflow_logs(transition_id);

CREATE INDEX IF NOT EXISTS idx_workflow_states_entity_type ON workflow_states(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_states_entity_id ON workflow_states(entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_current_state ON workflow_states(current_state);

CREATE INDEX IF NOT EXISTS idx_workflow_stats_entity_type ON workflow_stats(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_stats_rule_id ON workflow_stats(rule_id);

-- Funções auxiliares para workflow

-- Função para contar notificações não lidas por usuário
CREATE OR REPLACE FUNCTION get_workflow_stats_by_entity_type(
    entity_type_param VARCHAR
)
RETURNS TABLE (
    total_rules INTEGER,
    enabled_rules INTEGER,
    disabled_rules INTEGER,
    total_transitions INTEGER,
    auto_transitions INTEGER,
    manual_transitions INTEGER,
    last_execution TIMESTAMP WITH TIME ZONE,
    success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_rules,
        COUNT(CASE WHEN enabled THEN 1 END)::INTEGER as enabled_rules,
        COUNT(CASE WHEN NOT enabled THEN 1 END)::INTEGER as disabled_rules,
        COALESCE(SUM((transitions::jsonb)->'length')::INTEGER, 0)::INTEGER as total_transitions,
        COALESCE(SUM(CASE WHEN (transitions::jsonb)->'auto_trigger' = 'true' THEN 1 ELSE 0 END)::INTEGER, 0)::INTEGER as auto_transitions,
        COALESCE(SUM(CASE WHEN (transitions::jsonb)->'auto_trigger' = 'false' THEN 1 ELSE 0 END)::INTEGER, 0)::INTEGER as manual_transitions,
        MAX(updated_at) as last_execution,
        CASE 
            WHEN COUNT(*) = 0 THEN 100.0
            ELSE 100.0
        END as success_rate
    FROM workflow_rules 
    WHERE entity_type = entity_type_param;
END;
$$;

-- Função para obter logs de workflow por entidade
CREATE OR REPLACE FUNCTION get_workflow_logs_by_entity(
    entity_type_param VARCHAR,
    entity_id_param VARCHAR,
    limit_param INTEGER DEFAULT 100,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    rule_id UUID,
    transition_id UUID,
    action VARCHAR,
    description TEXT,
    result VARCHAR,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id,
        wl.rule_id,
        wl.transition_id,
        wl.action,
        wl.description,
        wl.result,
        wl.error_message,
        wl.created_at,
        wl.user_id
    FROM workflow_logs wl
    WHERE wl.entity_type = entity_type_param 
      AND wl.entity_id = entity_id_param
    ORDER BY wl.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$;

-- Função para limpar logs antigos de workflow
CREATE OR REPLACE FUNCTION cleanup_workflow_logs(
    retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM workflow_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Função para resetar estatísticas de uma regra
CREATE OR REPLACE FUNCTION reset_workflow_stats(
    rule_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE workflow_stats 
    SET execution_count = 0,
        success_count = 0,
        failure_count = 0,
        last_execution = NULL
    WHERE rule_id = rule_id_param;
END;
$$;

-- Trigger para atualizar timestamps
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workflow_rules_timestamp ON workflow_rules;
CREATE TRIGGER update_workflow_rules_timestamp
    BEFORE UPDATE ON workflow_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_timestamp();

DROP TRIGGER IF EXISTS update_workflow_transitions_timestamp ON workflow_transitions;
CREATE TRIGGER update_workflow_transitions_timestamp
    BEFORE UPDATE ON workflow_transitions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_timestamp();

DROP TRIGGER IF EXISTS update_workflow_stats_timestamp ON workflow_stats;
CREATE TRIGGER update_workflow_stats_timestamp
    BEFORE UPDATE ON workflow_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_timestamp();

-- Políticas de RLS (Row Level Security)

-- Políticas para workflow_rules
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem gerenciar regras
CREATE POLICY "Admin can manage workflow rules" ON workflow_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Políticas para workflow_transitions
ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage workflow transitions" ON workflow_transitions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Políticas para workflow_logs
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver logs das suas próprias ações
CREATE POLICY "Users can view their own workflow logs" ON workflow_logs
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- Apenas administradores podem inserir logs (via functions)
CREATE POLICY "Admin can insert workflow logs" ON workflow_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Políticas para workflow_states
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver estados das entidades que têm permissão
CREATE POLICY "Users can view workflow states" ON workflow_states
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager', 'user')
        )
    );

-- Políticas para workflow_stats
ALTER TABLE workflow_stats ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem ver estatísticas
CREATE POLICY "Admin can view workflow stats" ON workflow_stats
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Comentários para documentação
COMMENT ON TABLE workflow_rules IS 'Regras de workflow configuráveis';
COMMENT ON COLUMN workflow_rules.name IS 'Nome da regra de workflow';
COMMENT ON COLUMN workflow_rules.entity_type IS 'Tipo de entidade (work_order, task, department, user)';
COMMENT ON COLUMN workflow_rules.event_type IS 'Tipos de eventos que acionam a regra';
COMMENT ON COLUMN workflow_rules.conditions IS 'Condições da regra em formato JSON';
COMMENT ON COLUMN workflow_rules.transitions IS 'Transições da regra em formato JSON';
COMMENT ON COLUMN workflow_rules.priority IS 'Prioridade da regra (quanto maior, maior a prioridade)';

COMMENT ON TABLE workflow_transitions IS 'Transições de workflow';
COMMENT ON COLUMN workflow_transitions.from_state IS 'Estado de origem';
COMMENT ON COLUMN workflow_transitions.to_state IS 'Estado de destino';
COMMENT ON COLUMN workflow_transitions.auto_trigger IS 'Indica se a transição é automática';

COMMENT ON TABLE workflow_logs IS 'Logs de execução de workflow';
COMMENT ON COLUMN workflow_logs.result IS 'Resultado da execução (success, failed, skipped)';

COMMENT ON TABLE workflow_states IS 'Estados atuais das entidades';
COMMENT ON COLUMN workflow_states.current_state IS 'Estado atual da entidade';
COMMENT ON COLUMN workflow_states.previous_state IS 'Estado anterior da entidade';

COMMENT ON TABLE workflow_stats IS 'Estatísticas de execução de workflow';
COMMENT ON COLUMN workflow_stats.execution_count IS 'Contagem total de execuções';
COMMENT ON COLUMN workflow_stats.success_count IS 'Contagem de execuções bem-sucedidas';
COMMENT ON COLUMN workflow_stats.failure_count IS 'Contagem de execuções falhas';