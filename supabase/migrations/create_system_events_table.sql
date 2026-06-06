-- Criação da tabela de eventos do sistema
-- Esta tabela armazena todos os eventos de auditoria e atividade do sistema

CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    task_id UUID REFERENCES work_order_tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(type);
CREATE INDEX IF NOT EXISTS idx_system_events_work_order_id ON system_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_system_events_task_id ON system_events(task_id);
CREATE INDEX IF NOT EXISTS idx_system_events_user_id ON system_events(user_id);
CREATE INDEX IF NOT EXISTS idx_system_events_department_id ON system_events(department_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_type_created_at ON system_events(type, created_at);

-- Comentários para documentação
COMMENT ON TABLE system_events IS 'Tabela de auditoria que registra todos os eventos do sistema para rastreamento e compliance';
COMMENT ON COLUMN system_events.type IS 'Tipo do evento (ex: work_order_created, task_status_changed, etc.)';
COMMENT ON COLUMN system_events.metadata IS 'Dados adicionais do evento em formato JSON';
COMMENT ON COLUMN system_events.created_at IS 'Data e hora do evento';

-- Função para inserir eventos de forma padronizada
CREATE OR REPLACE FUNCTION log_system_event(
    p_type VARCHAR(100),
    p_work_order_id UUID DEFAULT NULL,
    p_task_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO system_events (type, work_order_id, task_id, user_id, department_id, metadata)
    VALUES (p_type, p_work_order_id, p_task_id, p_user_id, p_department_id, p_metadata)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de eventos
CREATE OR REPLACE FUNCTION get_event_stats(
    p_range_days INTEGER DEFAULT 7
) RETURNS TABLE(
    event_type VARCHAR(100),
    event_count BIGINT,
    day DATE,
    day_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH event_counts AS (
        SELECT 
            type as event_type,
            COUNT(*) as event_count
        FROM system_events 
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_range_days
        GROUP BY type
    ),
    daily_counts AS (
        SELECT 
            DATE(created_at) as day,
            COUNT(*) as day_count
        FROM system_events 
        WHERE created_at >= NOW() - INTERVAL '1 day' * p_range_days
        GROUP BY DATE(created_at)
    )
    SELECT 
        ec.event_type,
        ec.event_count,
        NULL::DATE as day,
        NULL::BIGINT as day_count
    FROM event_counts ec
    
    UNION ALL
    
    SELECT 
        NULL::VARCHAR(100) as event_type,
        NULL::BIGINT as event_count,
        dc.day,
        dc.day_count
    FROM daily_counts dc;
END;
$$ LANGUAGE plpgsql;

-- Função para obter eventos críticos
CREATE OR REPLACE FUNCTION get_critical_events(
    p_range_days INTEGER DEFAULT 7
) RETURNS SETOF system_events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM system_events 
    WHERE created_at >= NOW() - INTERVAL '1 day' * p_range_days
    AND type IN (
        'system_error',
        'permission_changed', 
        'user_role_changed',
        'work_order_deleted',
        'task_deleted'
    )
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar eventos de auditoria nas principais tabelas
-- (Esta parte seria implementada conforme necessário para cada tabela)

-- Exemplo de trigger para work_orders
CREATE OR REPLACE FUNCTION audit_work_orders()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_system_event(
            'work_order_created',
            NEW.id,
            NULL,
            NEW.created_by,
            NEW.department_id,
            jsonb_build_object('order_number', NEW.order_number, 'status', NEW.status)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_system_event(
            'work_order_status_changed',
            NEW.id,
            NULL,
            NEW.created_by,
            NEW.department_id,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_system_event(
            'work_order_deleted',
            OLD.id,
            NULL,
            OLD.created_by,
            OLD.department_id,
            jsonb_build_object('deleted_at', NOW())
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para work_order_tasks
CREATE OR REPLACE FUNCTION audit_work_order_tasks()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_system_event(
            'task_created',
            NEW.work_order_id,
            NEW.id,
            NEW.created_by,
            NULL,
            jsonb_build_object('task_name', NEW.name, 'status', NEW.status)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_system_event(
            'task_status_changed',
            NEW.work_order_id,
            NEW.id,
            NEW.created_by,
            NULL,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_system_event(
            'task_deleted',
            OLD.work_order_id,
            OLD.id,
            OLD.created_by,
            NULL,
            jsonb_build_object('deleted_at', NOW())
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers às tabelas
DROP TRIGGER IF EXISTS trigger_audit_work_orders ON work_orders;
CREATE TRIGGER trigger_audit_work_orders
    AFTER INSERT OR UPDATE OR DELETE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION audit_work_orders();

DROP TRIGGER IF EXISTS trigger_audit_work_order_tasks ON work_order_tasks;
CREATE TRIGGER trigger_audit_work_order_tasks
    AFTER INSERT OR UPDATE OR DELETE ON work_order_tasks
    FOR EACH ROW EXECUTE FUNCTION audit_work_order_tasks();

-- RLS (Row Level Security) - permitir leitura para todos os usuários autenticados
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view events" ON system_events
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert events" ON system_events
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Garantir que apenas funções específicas possam inserir eventos
-- (Esta seria uma política mais restrita em produção)