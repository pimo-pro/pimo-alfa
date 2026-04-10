<?php
declare(strict_types=1);

/**
 * Auth API — login + /me (JWT HS256).
 * Incluído por public_html/api/auth/index.php com define('PIMO_AUTH_ROUTER', true).
 * Incluído por api/users/index.php só para funções partilhadas (sem PIMO_AUTH_ROUTER).
 */

if (defined('PIMO_AUTH_LIB_LOADED')) {
    return;
}
define('PIMO_AUTH_LIB_LOADED', true);

const PIMO_USERS_FILE = __DIR__ . '/../data/users.json';
const PIMO_JWT_TTL = 86400;

function pimo_jwt_secret(): string
{
    $env = getenv('PIMO_JWT_SECRET');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    return 'pimo-hostinger-mudar-este-segredo-min-32-chars!!';
}

function pimo_cors(): void
{
    $allowed = ['https://pimo.pro', 'https://www.pimo.pro'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
}

function pimo_json_response(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

function pimo_b64url_encode(string $bin): string
{
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function pimo_b64url_decode(string $b64): string
{
    $b64 = strtr($b64, '-_', '+/');
    $pad = strlen($b64) % 4;
    if ($pad > 0) {
        $b64 .= str_repeat('=', 4 - $pad);
    }
    $raw = base64_decode($b64, true);
    return $raw === false ? '' : $raw;
}

function pimo_jwt_encode(array $payload, string $secret, int $ttlSec = PIMO_JWT_TTL): string
{
    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + $ttlSec;
    $h = pimo_b64url_encode(json_encode($header, JSON_THROW_ON_ERROR));
    $p = pimo_b64url_encode(json_encode($payload, JSON_THROW_ON_ERROR));
    $sig = pimo_b64url_encode(hash_hmac('sha256', $h . '.' . $p, $secret, true));
    return $h . '.' . $p . '.' . $sig;
}

/** @return array<string,mixed>|null */
function pimo_jwt_decode(string $jwt, string $secret): ?array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }
    [$h, $p, $s] = $parts;
    $check = pimo_b64url_encode(hash_hmac('sha256', $h . '.' . $p, $secret, true));
    if (!hash_equals($check, $s)) {
        return null;
    }
    $json = pimo_b64url_decode($p);
    $payload = json_decode($json, true);
    if (!is_array($payload)) {
        return null;
    }
    if (($payload['exp'] ?? 0) < time()) {
        return null;
    }
    return $payload;
}

/** @return list<array<string,mixed>> */
function pimo_load_users(): array
{
    if (!is_readable(PIMO_USERS_FILE)) {
        return [];
    }
    $raw = file_get_contents(PIMO_USERS_FILE);
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** @param list<array<string,mixed>> $users */
function pimo_save_users(array $users): void
{
    $dir = dirname(PIMO_USERS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(
        PIMO_USERS_FILE,
        json_encode($users, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)
    );
}

function pimo_ensure_default_admin(): void
{
    $users = pimo_load_users();
    foreach ($users as $u) {
        if (($u['email'] ?? '') === 'admin@pimo.local') {
            return;
        }
    }
    $users[] = [
        'id' => bin2hex(random_bytes(16)),
        'email' => 'admin@pimo.local',
        'username' => 'admin',
        'passwordHash' => password_hash('admin123', PASSWORD_DEFAULT),
        'role' => 'admin',
        'createdAt' => gmdate('c'),
    ];
    pimo_save_users($users);
}

/** @return array<string,list<string>> */
function pimo_role_permissions_map(): array
{
    return [
        'admin' => ['admin.full_access', 'project.view.all', 'project.edit.self', 'user.manage.below'],
        'ultra+' => ['project.view.factory', 'user.manage.below', 'project.edit.self'],
        'ultra' => ['project.edit.self', 'project.view.self', 'project.send_to_production.self'],
        'pro' => ['project.edit.self', 'project.view.self'],
        'visitor' => ['project.view.self'],
    ];
}

/** @return list<string> */
function pimo_effective_permissions(string $role): array
{
    $map = pimo_role_permissions_map();
    return $map[$role] ?? $map['visitor'];
}

/** @param list<array<string,mixed>> $users */
function pimo_find_user_by_id(array $users, string $id): ?array
{
    foreach ($users as $u) {
        if (($u['id'] ?? '') === $id) {
            return $u;
        }
    }
    return null;
}

/** @param list<array<string,mixed>> $users */
function pimo_find_user_by_email(array $users, string $email): ?array
{
    $e = strtolower(trim($email));
    foreach ($users as $u) {
        if (strtolower((string) ($u['email'] ?? '')) === $e) {
            return $u;
        }
    }
    return null;
}

/** Username comparado em minúsculas (único para registo público). */
function pimo_find_user_by_username_ci(array $users, string $username): ?array
{
    $want = strtolower(trim($username));
    if ($want === '') {
        return null;
    }
    foreach ($users as $u) {
        if (strtolower(trim((string) ($u['username'] ?? ''))) === $want) {
            return $u;
        }
    }
    return null;
}

const PIMO_REGISTER_MIN_PASSWORD_LEN = 6;
const PIMO_USER_SETTINGS_DIR_FOR_REGISTER = __DIR__ . '/../data/user-settings';

/** Registo público: só `visitor` ou `pro`; qualquer outro valor (ex.: admin) → visitor. */
function pimo_register_normalize_public_role(mixed $roleInput): string
{
    $r = strtolower(trim((string) ($roleInput ?? '')));
    return $r === 'pro' ? 'pro' : 'visitor';
}

/** Ficheiro inicial para GET/PATCH /user/settings (vazio). */
function pimo_auth_write_empty_user_settings(string $userId): void
{
    if (!is_dir(PIMO_USER_SETTINGS_DIR_FOR_REGISTER)) {
        mkdir(PIMO_USER_SETTINGS_DIR_FOR_REGISTER, 0755, true);
    }
    $path = PIMO_USER_SETTINGS_DIR_FOR_REGISTER . '/user-settings-' . $userId . '.json';
    $payload = [
        'updatedAt' => null,
        'settings' => new stdClass(),
    ];
    $encoded = json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT
    );
    file_put_contents($path, $encoded);
}

function pimo_auth_handle_register(): void
{
    pimo_ensure_default_admin();
    $raw = file_get_contents('php://input') ?: '';
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        pimo_json_response(['status' => 'error', 'message' => 'JSON inválido'], 400);
        return;
    }
    $username = trim((string) ($body['username'] ?? ''));
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    if ($username === '' || $email === '') {
        pimo_json_response(['status' => 'error', 'message' => 'username e email obrigatórios'], 400);
        return;
    }
    if (strlen($password) < PIMO_REGISTER_MIN_PASSWORD_LEN) {
        pimo_json_response([
            'status' => 'error',
            'message' => 'Password demasiado curta (mínimo ' . (string) PIMO_REGISTER_MIN_PASSWORD_LEN . ' caracteres)',
        ], 400);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        pimo_json_response(['status' => 'error', 'message' => 'Email inválido'], 400);
        return;
    }
    $users = pimo_load_users();
    if (pimo_find_user_by_email($users, $email) !== null) {
        pimo_json_response(['status' => 'error', 'message' => 'Email já registado'], 409);
        return;
    }
    if (pimo_find_user_by_username_ci($users, $username) !== null) {
        pimo_json_response(['status' => 'error', 'message' => 'Username já em uso'], 409);
        return;
    }
    $role = pimo_register_normalize_public_role($body['role'] ?? null);
    $id = bin2hex(random_bytes(16));
    $newUser = [
        'id' => $id,
        'email' => $email,
        'username' => $username,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role,
        'createdAt' => gmdate('c'),
    ];
    $users[] = $newUser;
    pimo_save_users($users);
    try {
        pimo_auth_write_empty_user_settings($id);
    } catch (Throwable $e) {
        $users = array_values(array_filter($users, static fn($u) => ($u['id'] ?? '') !== $id));
        pimo_save_users($users);
        pimo_json_response(['status' => 'error', 'message' => 'Falha ao criar ficheiro de preferências'], 500);
        return;
    }
    pimo_json_response([
        'status' => 'ok',
        'user' => [
            'id' => $id,
            'username' => $username,
            'email' => $email,
            'role' => $role,
        ],
    ], 201);
}

function pimo_bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
    if (!is_string($h) || $h === '') {
        return null;
    }
    if (preg_match('/Bearer\s+(\S+)/i', $h, $m)) {
        return $m[1];
    }
    return null;
}

function pimo_request_path(): string
{
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH);
    return is_string($path) ? rtrim($path, '/') : '/';
}

function pimo_auth_handle_login(): void
{
    pimo_ensure_default_admin();
    $raw = file_get_contents('php://input') ?: '';
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        pimo_json_response(['status' => 'error', 'message' => 'JSON inválido'], 400);
        return;
    }
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    if ($email === '' || $password === '') {
        pimo_json_response(['status' => 'error', 'message' => 'email e password obrigatórios'], 400);
        return;
    }
    $users = pimo_load_users();
    $user = pimo_find_user_by_email($users, $email);
    if ($user === null || empty($user['passwordHash']) || !password_verify($password, (string) $user['passwordHash'])) {
        pimo_json_response(['status' => 'error', 'message' => 'Credenciais inválidas'], 401);
        return;
    }
    $id = (string) $user['id'];
    $username = (string) ($user['username'] ?? $user['email']);
    $role = (string) ($user['role'] ?? 'visitor');
    $token = pimo_jwt_encode(['sub' => $id, 'email' => $user['email']], pimo_jwt_secret());
    pimo_json_response([
        'status' => 'ok',
        'token' => $token,
        'user' => ['id' => $id, 'username' => $username, 'role' => $role],
    ]);
}

function pimo_auth_handle_me(): void
{
    $token = pimo_bearer_token();
    if ($token === null || $token === '') {
        pimo_json_response(['status' => 'error', 'message' => 'Não autenticado'], 401);
        return;
    }
    $payload = pimo_jwt_decode($token, pimo_jwt_secret());
    if ($payload === null || empty($payload['sub'])) {
        pimo_json_response(['status' => 'error', 'message' => 'Token inválido'], 401);
        return;
    }
    $users = pimo_load_users();
    $user = pimo_find_user_by_id($users, (string) $payload['sub']);
    if ($user === null) {
        pimo_json_response(['status' => 'error', 'message' => 'Utilizador não encontrado'], 401);
        return;
    }
    $role = (string) ($user['role'] ?? 'visitor');
    $perms = pimo_effective_permissions($role);
    if ($role === 'admin') {
        $perms = array_values(array_unique([...$perms, 'admin.full_access']));
    }
    pimo_json_response([
        'status' => 'ok',
        'user' => [
            'id' => (string) $user['id'],
            'username' => (string) ($user['username'] ?? $user['email']),
            'role' => $role,
        ],
        'permissions' => $perms,
    ]);
}

function pimo_auth_router(): void
{
    pimo_cors();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        return;
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = pimo_request_path();
    $endsRegister = str_ends_with($path, '/auth/register');
    $endsLogin = str_ends_with($path, '/auth/login');
    $isMe = $path === '/me' || str_ends_with($path, '/me');
    $postToAuthScript = $method === 'POST' && str_contains($path, 'api/auth');

    try {
        if ($method === 'POST' && $endsRegister) {
            pimo_auth_handle_register();
            return;
        }
        if ($method === 'POST' && ($endsLogin || $postToAuthScript)) {
            pimo_auth_handle_login();
            return;
        }
        if ($method === 'GET' && $isMe) {
            pimo_auth_handle_me();
            return;
        }
        pimo_json_response(['status' => 'error', 'message' => 'Rota não encontrada'], 404);
    } catch (Throwable $e) {
        pimo_json_response(['status' => 'error', 'message' => 'Erro interno'], 500);
    }
}

if (defined('PIMO_AUTH_ROUTER') && PIMO_AUTH_ROUTER) {
    pimo_auth_router();
}
