<?php

namespace App\Services;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class IamAuthService
{
    public function authenticate(Request $request): array
    {
        $token = $request->bearerToken();
        if (!$token) {
            return [
                'ok'      => false,
                'status'  => 401,
                'message' => 'Bạn cần đăng nhập trước khi thực hiện thao tác này.',
            ];
        }

        $authServiceUrl = rtrim((string) env('AUTH_SERVICE_URL', 'http://127.0.0.1:4000'), '/');

        try {
            $response = Http::timeout(3)
                ->withToken($token)
                ->acceptJson()
                ->get("{$authServiceUrl}/api/auth/me");
        } catch (\Throwable $e) {
            Log::error('IAM Auth Service connection failed (fail-closed)', [
                'url'   => "{$authServiceUrl}/api/auth/me",
                'error' => $e->getMessage(),
            ]);

            return [
                'ok'      => false,
                'status'  => 503,
                'message' => 'Không thể kết nối đến Auth Service để xác thực phiên đăng nhập. Vui lòng thử lại sau.',
            ];
        }

        if (in_array($response->status(), [401, 403], true)) {
            return [
                'ok'      => false,
                'status'  => 401,
                'message' => 'Token đăng nhập không hợp lệ hoặc đã hết hạn.',
            ];
        }

        if (!$response->successful()) {
            Log::warning('IAM Auth Service returned non-2xx status (fail-closed)', [
                'status' => $response->status(),
            ]);

            return [
                'ok'      => false,
                'status'  => 503,
                'message' => 'Auth Service hiện không khả dụng. Vui lòng thử lại sau.',
            ];
        }

        $userPayload = $this->extractUserPayload($response->json());
        if ($userPayload === null) {
            Log::warning('IAM Auth Service returned malformed user payload (fail-closed)');

            return [
                'ok'      => false,
                'status'  => 503,
                'message' => 'Dữ liệu xác thực từ Auth Service không hợp lệ.',
            ];
        }

        $resolved = $this->resolveLocalUser($userPayload);

        return [
            'ok'   => true,
            'user' => $resolved,
        ];
    }

    public function authorizeOwner(array $authUser, int $resourceUserId): ?JsonResponse
    {
        if (!empty($authUser['is_staff'])) {
            return null;
        }

        $authUserId = $authUser['ma_nguoi_dung'] ?? null;
        if ($authUserId === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể xác định tài khoản người dùng tương ứng với phiên đăng nhập hiện tại.',
            ], 403);
        }

        if ((int) $authUserId !== $resourceUserId) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn không có quyền truy cập hoặc thao tác trên tài nguyên của người dùng khác.',
            ], 403);
        }

        return null;
    }

    public function authorizeStaff(array $authUser): ?JsonResponse
    {
        if (!empty($authUser['is_staff'])) {
            return null;
        }

        return response()->json([
            'status'  => 'error',
            'message' => 'Bạn không có quyền quản trị để thực hiện thao tác này.',
        ], 403);
    }

    public function errorResponse(array $authResult): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => $authResult['message'] ?? 'Xác thực không thành công.',
        ], (int) ($authResult['status'] ?? 401));
    }

    private function extractUserPayload(mixed $body): ?array
    {
        if (!is_array($body)) {
            return null;
        }

        $candidate = null;
        if (isset($body['data']['user']) && is_array($body['data']['user'])) {
            $candidate = $body['data']['user'];
        } elseif (isset($body['user']) && is_array($body['user'])) {
            $candidate = $body['user'];
        } elseif (isset($body['data']) && is_array($body['data'])) {
            $candidate = $body['data'];
        } else {
            $candidate = $body;
        }

        $hasIdentifier = isset($candidate['id'])
            || isset($candidate['ma_nguoi_dung'])
            || (isset($candidate['email']) && is_string($candidate['email']) && trim($candidate['email']) !== '');

        return $hasIdentifier ? $candidate : null;
    }

    private function resolveLocalUser(array $payload): array
    {
        $email = isset($payload['email']) && is_string($payload['email'])
            ? strtolower(trim($payload['email']))
            : null;
        $role = strtoupper((string) ($payload['role'] ?? $payload['vai_tro'] ?? 'CUSTOMER'));

        $localUserId = null;

        if (isset($payload['ma_nguoi_dung']) && is_numeric($payload['ma_nguoi_dung'])) {
            $localUserId = (int) $payload['ma_nguoi_dung'];
        }

        if ($localUserId === null && $email !== null && $email !== '' && Schema::hasTable('nguoidung')) {
            $row = DB::table('nguoidung')
                ->whereRaw('LOWER(email) = ?', [$email])
                ->first(['ma_nguoi_dung', 'vai_tro']);

            if (!$row) {
                // Tự động đồng bộ bản ghi ánh xạ người dùng đã xác thực từ IAM (MongoDB) sang bảng nguoidung (MySQL)
                $dbRole = match ($role) {
                    'ADMIN' => 'ADMIN',
                    'STAFF', 'SELLER' => 'STAFF',
                    default => 'CUSTOMER',
                };
                $displayName = trim((string) ($payload['name'] ?? $payload['ho_ten'] ?? ''));
                if ($displayName === '') {
                    $displayName = explode('@', $email)[0] ?: 'Customer';
                }

                try {
                    DB::table('nguoidung')->insertOrIgnore([
                        'ho_ten'     => mb_substr($displayName, 0, 255),
                        'email'      => $email,
                        'mat_khau'   => 'IAM_MANAGED',
                        'vai_tro'    => $dbRole,
                        'trang_thai' => 1,
                    ]);

                    $row = DB::table('nguoidung')
                        ->whereRaw('LOWER(email) = ?', [$email])
                        ->first(['ma_nguoi_dung', 'vai_tro']);
                } catch (\Throwable $e) {
                    Log::warning('Failed to auto-sync IAM user into nguoidung', [
                        'email' => $email,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if ($row) {
                $localUserId = (int) $row->ma_nguoi_dung;
                if (empty($payload['role']) && empty($payload['vai_tro']) && !empty($row->vai_tro)) {
                    $role = strtoupper((string) $row->vai_tro);
                }
            }
        }

        if ($localUserId === null && isset($payload['id']) && is_numeric($payload['id'])) {
            $localUserId = (int) $payload['id'];
        }

        $isStaff = in_array($role, ['ADMIN', 'STAFF', 'SELLER'], true);

        return [
            'iam_id'        => $payload['id'] ?? null,
            'ma_nguoi_dung' => $localUserId,
            'email'         => $email,
            'role'          => $role,
            'is_staff'      => $isStaff,
            'raw'           => $payload,
        ];
    }
}
