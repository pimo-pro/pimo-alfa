<?php
declare(strict_types=1);

/**
 * Configuração global publicada (GET público).
 * Ficheiro: api/data/global-settings.json
 * URL (com rewrite): GET /config/global
 */

if (defined('PIMO_GLOBAL_CONFIG_LIB_LOADED')) {
    return;
}
define('PIMO_GLOBAL_CONFIG_LIB_LOADED', true);

const PIMO_GLOBAL_SETTINGS_FILE = __DIR__ . '/../data/global-settings.json';

require_once __DIR__ . '/../auth/index.php';

function pimo_global_config_cors(): void
{
    $allowed = ['https://pimo.pro', 'https://www.pimo.pro'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    header('Access-Control-Allow-Methods: GET, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
}

function pimo_global_config_json(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
}

/**
 * @return array{valid: bool, version: string, updatedAt: ?string, settings: array<string, mixed>}
 */
function pimo_global_config_validate_file_payload(array $data): array
{
    $version = isset($data['version']) && is_string($data['version']) && $data['version'] !== ''
        ? $data['version']
        : 'v0';
    $updatedAt = null;
    if (isset($data['updatedAt']) && is_string($data['updatedAt']) && $data['updatedAt'] !== '') {
        $updatedAt = $data['updatedAt'];
    }
    $settings = $data['settings'] ?? null;
    if (!is_array($settings)) {
        return ['valid' => false, 'version' => $version, 'updatedAt' => $updatedAt, 'settings' => []];
    }
    // JSON {} com json_decode(..., true) vazio = []; aceitar como objeto vazio.
    if ($settings !== [] && array_keys($settings) === range(0, count($settings) - 1)) {
        return ['valid' => false, 'version' => $version, 'updatedAt' => $updatedAt, 'settings' => []];
    }
    return ['valid' => true, 'version' => $version, 'updatedAt' => $updatedAt, 'settings' => $settings];
}

function pimo_global_config_handle_get(): void
{
    if (!is_readable(PIMO_GLOBAL_SETTINGS_FILE)) {
        pimo_global_config_json([
            'status' => 'ok',
            'version' => 'v0',
            'updatedAt' => null,
            'settings' => new stdClass(),
        ]);
        return;
    }
    $raw = file_get_contents(PIMO_GLOBAL_SETTINGS_FILE);
    if ($raw === false || $raw === '') {
        pimo_global_config_json([
            'status' => 'ok',
            'version' => 'v0',
            'updatedAt' => null,
            'settings' => new stdClass(),
        ]);
        return;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        pimo_global_config_json([
            'status' => 'error',
            'message' => 'Ficheiro global-settings.json inválido',
        ], 500);
        return;
    }
    $v = pimo_global_config_validate_file_payload($data);
    if (!$v['valid']) {
        pimo_global_config_json([
            'status' => 'error',
            'message' => 'Estrutura settings inválida (esperado objeto associativo)',
        ], 500);
        return;
    }
    $settingsOut = $v['settings'] === [] ? new stdClass() : $v['settings'];
    pimo_global_config_json([
        'status' => 'ok',
        'version' => $v['version'],
        'updatedAt' => $v['updatedAt'],
        'settings' => $settingsOut,
    ]);
}

/** @return array<string,mixed>|null utilizador autenticado */
function pimo_global_config_authenticated_user(): ?array
{
    $token = pimo_bearer_token();
    if ($token === null || $token === '') {
        return null;
    }
    $payload = pimo_jwt_decode($token, pimo_jwt_secret());
    if ($payload === null || empty($payload['sub'])) {
        return null;
    }
    $users = pimo_load_users();
    return pimo_find_user_by_id($users, (string) $payload['sub']);
}

function pimo_global_config_user_has_full_access(array $user): bool
{
    $role = (string) ($user['role'] ?? 'visitor');
    $perms = pimo_effective_permissions($role);
    if ($role === 'admin') {
        $perms = array_values(array_unique([...$perms, 'admin.full_access']));
    }
    return in_array('admin.full_access', $perms, true);
}

function pimo_global_config_handle_patch(): void
{
    $user = pimo_global_config_authenticated_user();
    if ($user === null) {
        pimo_json_response(['status' => 'error', 'message' => 'Não autenticado'], 401);
        return;
    }
    if (!pimo_global_config_user_has_full_access($user)) {
        pimo_json_response(['status' => 'error', 'message' => 'Sem permissão (requer admin.full_access)'], 403);
        return;
    }
    $raw = file_get_contents('php://input') ?: '';
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        pimo_json_response(['status' => 'error', 'message' => 'JSON inválido'], 400);
        return;
    }
    $version = isset($body['version']) && is_string($body['version']) ? trim($body['version']) : '';
    $settings = $body['settings'] ?? null;
    if ($version === '' || !is_array($settings)) {
        pimo_json_response(['status' => 'error', 'message' => 'Campos version (string) e settings (object) obrigatórios'], 400);
        return;
    }
    if ($settings !== [] && array_keys($settings) === range(0, count($settings) - 1)) {
        pimo_json_response(['status' => 'error', 'message' => 'settings deve ser objeto associativo'], 400);
        return;
    }
    $toValidate = [
        'version' => $version,
        'updatedAt' => null,
        'settings' => $settings,
    ];
    $v = pimo_global_config_validate_file_payload($toValidate);
    if (!$v['valid']) {
        pimo_json_response(['status' => 'error', 'message' => 'Estrutura settings inválida'], 400);
        return;
    }
    $dir = dirname(PIMO_GLOBAL_SETTINGS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $now = gmdate('c');
    $settingsOut = $v['settings'] === [] ? new stdClass() : $v['settings'];
    $filePayload = [
        'version' => $v['version'],
        'updatedAt' => $now,
        'settings' => $settingsOut,
    ];
    $encoded = json_encode(
        $filePayload,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT
    );
    if (file_put_contents(PIMO_GLOBAL_SETTINGS_FILE, $encoded) === false) {
        pimo_json_response(['status' => 'error', 'message' => 'Falha ao gravar ficheiro'], 500);
        return;
    }
    pimo_json_response([
        'status' => 'ok',
        'version' => $v['version'],
        'updatedAt' => $now,
        'settings' => $settingsOut,
    ]);
}

function pimo_global_config_router(): void
{
    pimo_global_config_cors();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        return;
    }
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    try {
        if ($method === 'GET') {
            pimo_global_config_handle_get();
            return;
        }
        if ($method === 'PATCH') {
            pimo_global_config_handle_patch();
            return;
        }
        pimo_global_config_json(['status' => 'error', 'message' => 'Método não suportado'], 405);
    } catch (Throwable $e) {
        pimo_global_config_json(['status' => 'error', 'message' => 'Erro interno'], 500);
    }
}

if (defined('PIMO_GLOBAL_CONFIG_ROUTER') && PIMO_GLOBAL_CONFIG_ROUTER) {
    pimo_global_config_router();
}
