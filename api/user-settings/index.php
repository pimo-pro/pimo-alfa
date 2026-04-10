<?php
declare(strict_types=1);

/**
 * User settings online — GET/PATCH com JWT (mesmas funções que /me).
 * Persistência: api/data/user-settings/<userId>.json
 * Merge profundo no PATCH; o cliente re-valida com validateSettings.
 */

require_once __DIR__ . '/../auth/index.php';

const PIMO_USER_SETTINGS_DIR = __DIR__ . '/../data/user-settings';

/** @return array<string,mixed>|null */
function pimo_user_settings_sanitize_id(?string $id): ?string
{
    if ($id === null) {
        return null;
    }
    $id = trim($id);
    if ($id === '') {
        return null;
    }
    if (preg_match('/^[a-f0-9]{16,64}$/', $id) !== 1) {
        return null;
    }
    return $id;
}

function pimo_user_settings_path(string $userId): string
{
    return PIMO_USER_SETTINGS_DIR . '/user-settings-' . $userId . '.json';
}

/** @return array{updatedAt: string, settings: array<string,mixed>}|null */
function pimo_user_settings_load(string $userId): ?array
{
    $path = pimo_user_settings_path($userId);
    if (!is_readable($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return null;
    }
    $settings = $data['settings'] ?? null;
    if (!is_array($settings)) {
        return null;
    }
    $updatedAt = isset($data['updatedAt']) && is_string($data['updatedAt']) ? $data['updatedAt'] : gmdate('c');
    return ['updatedAt' => $updatedAt, 'settings' => $settings];
}

function pimo_is_assoc_array(array $arr): bool
{
    if ($arr === []) {
        return true;
    }
    return array_keys($arr) !== range(0, count($arr) - 1);
}

/** Merge profundo só para arrays associativos; arrays numéricos são substituídos. */
function pimo_deep_merge_settings(mixed $base, mixed $patch): mixed
{
    if (!is_array($base) || !is_array($patch)) {
        return $patch;
    }
    if (!pimo_is_assoc_array($base) || !pimo_is_assoc_array($patch)) {
        return $patch;
    }
    foreach ($patch as $k => $v) {
        if (!is_string($k) && !is_int($k)) {
            continue;
        }
        $key = (string) $k;
        if (
            isset($base[$key]) && is_array($base[$key]) && is_array($v)
            && pimo_is_assoc_array($base[$key]) && pimo_is_assoc_array($v)
        ) {
            $base[$key] = pimo_deep_merge_settings($base[$key], $v);
        } else {
            $base[$key] = $v;
        }
    }
    return $base;
}

function pimo_user_settings_save(string $userId, array $settings): string
{
    if (!is_dir(PIMO_USER_SETTINGS_DIR)) {
        mkdir(PIMO_USER_SETTINGS_DIR, 0755, true);
    }
    $now = gmdate('c');
    $payload = [
        'updatedAt' => $now,
        'settings' => $settings,
    ];
    $path = pimo_user_settings_path($userId);
    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        throw new RuntimeException('json_encode falhou');
    }
    file_put_contents($path, $encoded);
    return $now;
}

/** @return array<string,mixed>|null utilizador autenticado ou null */
function pimo_user_settings_require_user(): ?array
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
    $user = pimo_find_user_by_id($users, (string) $payload['sub']);
    return $user;
}

function pimo_user_settings_handle_get(): void
{
    $user = pimo_user_settings_require_user();
    if ($user === null) {
        pimo_json_response(['status' => 'error', 'message' => 'Não autenticado'], 401);
        return;
    }
    $id = pimo_user_settings_sanitize_id((string) ($user['id'] ?? ''));
    if ($id === null) {
        pimo_json_response(['status' => 'error', 'message' => 'ID inválido'], 400);
        return;
    }
    $loaded = pimo_user_settings_load($id);
    if ($loaded === null) {
        pimo_json_response([
            'status' => 'ok',
            'settings' => null,
            'updatedAt' => null,
        ]);
        return;
    }
    pimo_json_response([
        'status' => 'ok',
        'settings' => $loaded['settings'],
        'updatedAt' => $loaded['updatedAt'],
    ]);
}

function pimo_user_settings_handle_patch(): void
{
    $user = pimo_user_settings_require_user();
    if ($user === null) {
        pimo_json_response(['status' => 'error', 'message' => 'Não autenticado'], 401);
        return;
    }
    $id = pimo_user_settings_sanitize_id((string) ($user['id'] ?? ''));
    if ($id === null) {
        pimo_json_response(['status' => 'error', 'message' => 'ID inválido'], 400);
        return;
    }
    $raw = file_get_contents('php://input') ?: '';
    $patch = json_decode($raw, true);
    if (!is_array($patch)) {
        pimo_json_response(['status' => 'error', 'message' => 'JSON inválido'], 400);
        return;
    }
    if ($patch === []) {
        pimo_json_response(['status' => 'error', 'message' => 'Body vazio'], 400);
        return;
    }

    $existing = pimo_user_settings_load($id);
    $base = $existing !== null ? $existing['settings'] : [];
    $merged = pimo_deep_merge_settings($base, $patch);
    if (!is_array($merged)) {
        $merged = [];
    }
    $updatedAt = pimo_user_settings_save($id, $merged);
    pimo_json_response([
        'status' => 'ok',
        'settings' => $merged,
        'updatedAt' => $updatedAt,
    ]);
}

function pimo_user_settings_router(): void
{
    pimo_cors();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        return;
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    try {
        if ($method === 'GET') {
            pimo_user_settings_handle_get();
            return;
        }
        if ($method === 'PATCH') {
            pimo_user_settings_handle_patch();
            return;
        }
        pimo_json_response(['status' => 'error', 'message' => 'Método não suportado'], 405);
    } catch (Throwable $e) {
        pimo_json_response(['status' => 'error', 'message' => 'Erro interno'], 500);
    }
}

if (defined('PIMO_USER_SETTINGS_ROUTER') && PIMO_USER_SETTINGS_ROUTER) {
    pimo_user_settings_router();
}
