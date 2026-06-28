/** Sessão livre do operador (sem work order atribuído). */
export const OPERATOR_SESSION_FREE = 'SESSION_FREE' as const;

export type OperatorSessionId = typeof OPERATOR_SESSION_FREE | string;
