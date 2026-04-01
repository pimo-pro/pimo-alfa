<?php
declare(strict_types=1);

/**
 * CRUD mínimo de utilizadores (só admin).
 * Entrada: public_html/api/users/index.php com define('PIMO_USERS_ROUTER', true).
 */

require_once __DIR__ . '/../auth/index.php';

function pimo_users_public(array $u): array
{
    return [
        'id' => (string) ($u['id'] ?? ''),
        'email' => (string) ($u['email'] ?? ''),
        'username' => (string) ($u['username'] ?? ''),
        'role' => (string) ($u['role'] ?? 'visitor'),
        'createdAt' => (string) ($u['createdAt'] ?? ''),
    ];
}

function pimo_require_admin_user(): ?array
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
    if ($user === null) {
        return null;
    }
    if (($user['role'] ?? '') !== 'admin') {
        return null;
    }
    return $user;
}

function pimo_users_router(): void
{
    pimo_cors();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        return;
    }

    $admin = pimo_require_admin_user();
    if ($admin === null) {
        pimo_json_response(['status' => 'error', 'message' => 'Proibido'], 403);
        return;
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $id = isset($_GET['id']) ? trim((string) $_GET['id']) : '';

    try {
        $users = pimo_load_users();

        if ($method === 'GET') {
            $out = array_map('pimo_users_public', $users);
            pimo_json_response(['status' => 'ok', 'users' => $out]);
            return;
        }

        if ($method === 'POST') {
            $raw = file_get_contents('php://input') ?: '';
            $body = json_decode($raw, true);
            if (!is_array($body)) {
                pimo_json_response(['status' => 'error', 'message' => 'JSON inválido'], 400);
                return;
            }
            $email = strtolower(trim((string) ($body['email'] ?? '')));
            $password = (string) ($body['password'] ?? '');
            $username = trim((string) ($body['username'] ?? ''));
            $role = trim((string) ($body['role'] ?? 'visitor'));
            if ($email === '' || $password === '') {
                pimo_json_response(['status' => 'error', 'message' => 'email e password obrigatórios'], 400);
                return;
            }
            if (pimo_find_user_by_email($users, $email) !== null) {
                pimo_json_response(['status' => 'error', 'message' => 'Email já existe'], 409);
                return;
            }
            if ($username === '') {
                $username = strstr($email, '@', true) ?: $email;
            }
            $newUser = [
                'id' => bin2hex(random_bytes(16)),
                'email' => $email,
                'username' => $username,
                'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
                'role' => $role !== '' ? $role : 'visitor',
                'createdAt' => gmdate('c'),
            ];
            $users[] = $newUser;
            pimo_save_users($users);
            pimo_json_response(['status' => 'ok', 'user' => pimo_users_public($newUser)], 201);
            return;
        }

        if ($method === 'PUT') {
            if ($id === '') {
                pimo_json_response(['status' => 'error', 'message' => 'id obrigatório'], 400);
                return;
            }
            $raw = file_get_contents('php://input') ?: '';
            $body = json_decode($raw, true);
            if (!is_array($body)) {
                pimo_json_response(['status' => 'error', 'message' => 'JSON inválido'], 400);
                return;
            }
            $found = false;
            foreach ($users as $i => $u) {
                if (($u['id'] ?? '') !== $id) {
                    continue;
                }
                $found = true;
                if (isset($body['email'])) {
                    $ne = strtolower(trim((string) $body['email']));
                    if ($ne !== '' && $ne !== strtolower((string) $u['email'])) {
                        if (pimo_find_user_by_email($users, $ne) !== null) {
                            pimo_json_response(['status' => 'error', 'message' => 'Email já existe'], 409);
                            return;
                        }
                        $users[$i]['email'] = $ne;
                    }
                }
                if (isset($body['username'])) {
                    $users[$i]['username'] = trim((string) $body['username']);
                }
                if (isset($body['role'])) {
                    $users[$i]['role'] = trim((string) $body['role']);
                }
                if (!empty($body['password'])) {
                    $users[$i]['passwordHash'] = password_hash((string) $body['password'], PASSWORD_DEFAULT);
                }
                break;
            }
            if (!$found) {
                pimo_json_response(['status' => 'error', 'message' => 'Não encontrado'], 404);
                return;
            }
            pimo_save_users($users);
            $updated = pimo_find_user_by_id($users, $id);
            pimo_json_response(['status' => 'ok', 'user' => pimo_users_public($updated ?? [])]);
            return;
        }

        if ($method === 'DELETE') {
            if ($id === '') {
                pimo_json_response(['status' => 'error', 'message' => 'id obrigatório'], 400);
                return;
            }
            $admins = array_filter($users, static fn($u) => ($u['role'] ?? '') === 'admin');
            $target = pimo_find_user_by_id($users, $id);
            if ($target === null) {
                pimo_json_response(['status' => 'error', 'message' => 'Não encontrado'], 404);
                return;
            }
            if (($target['role'] ?? '') === 'admin' && count($admins) <= 1) {
                pimo_json_response(['status' => 'error', 'message' => 'Não é possível apagar o último admin'], 400);
                return;
            }
            $users = array_values(array_filter($users, static fn($u) => ($u['id'] ?? '') !== $id));
            pimo_save_users($users);
            pimo_json_response(['status' => 'ok']);
            return;
        }

        pimo_json_response(['status' => 'error', 'message' => 'Método não suportado'], 405);
    } catch (Throwable $e) {
        pimo_json_response(['status' => 'error', 'message' => 'Erro interno'], 500);
    }
}

if (defined('PIMO_USERS_ROUTER') && PIMO_USERS_ROUTER) {
    pimo_users_router();
}
