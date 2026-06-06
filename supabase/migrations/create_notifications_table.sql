-- Criação da tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('in-app', 'email', 'sms', 'webhook')),
    is_read BOOLEAN DEFAULT FALSE,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_created_at (created_at),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_severity (severity),
    INDEX idx_notifications_channel (channel)
);

-- Criação de índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Política de RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Usuários podem ver apenas suas próprias notificações
CREATE POLICY "Users can view own notifications" ON notifications
    FOR ALL
    USING (auth.uid() = user_id);

-- Usuários podem atualizar apenas suas próprias notificações
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Usuários podem inserir notificações (para notificações automáticas)
CREATE POLICY "Users can insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Função para contar notificações não lidas
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = user_uuid AND is_read = FALSE;
    
    RETURN unread_count;
END;
$$;

-- Função para marcar todas as notificações como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET read_at = NOW(), is_read = TRUE
    WHERE user_id = user_uuid AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Trigger para atualizar o campo read_at quando is_read for marcado como TRUE
CREATE OR REPLACE FUNCTION update_read_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND NEW.read_at IS NULL THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_read_at_trigger ON notifications;
CREATE TRIGGER update_read_at_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_read_at_trigger();

-- Comentários para documentação
COMMENT ON TABLE notifications IS 'Tabela de notificações do sistema';
COMMENT ON COLUMN notifications.type IS 'Tipo da notificação (ex: evento, alerta, aviso)';
COMMENT ON COLUMN notifications.severity IS 'Severidade da notificação (info, warning, error, critical)';
COMMENT ON COLUMN notifications.title IS 'Título da notificação';
COMMENT ON COLUMN notifications.message IS 'Mensagem da notificação';
COMMENT ON COLUMN notifications.metadata IS 'Dados adicionais da notificação em formato JSON';
COMMENT ON COLUMN notifications.created_at IS 'Data de criação da notificação';
COMMENT ON COLUMN notifications.read_at IS 'Data de leitura da notificação';
COMMENT ON COLUMN notifications.user_id IS 'ID do usuário que receberá a notificação';
COMMENT ON COLUMN notifications.channel IS 'Canal de entrega da notificação (in-app, email, sms, webhook)';
COMMENT ON COLUMN notifications.is_read IS 'Indica se a notificação foi lida';