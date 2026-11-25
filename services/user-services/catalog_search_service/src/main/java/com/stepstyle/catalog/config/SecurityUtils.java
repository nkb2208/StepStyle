package com.stepstyle.catalog.config;

import com.stepstyle.catalog.exception.ForbiddenException;

public final class SecurityUtils {

    private SecurityUtils() {}

    /**
     * Enforces that the request has the X-User-Role header containing SELLER or ADMIN.
     * Throws ForbiddenException (HTTP 403) if missing or unauthorized.
     */
    public static void verifySellerOrAdmin(String userRole) {
        if (userRole == null || userRole.isBlank()) {
            throw new ForbiddenException("Access denied: X-User-Role header is required");
        }
        String normalized = userRole.toUpperCase();
        if (!normalized.contains("SELLER") && !normalized.contains("ADMIN")) {
            throw new ForbiddenException("Access denied: Operation requires SELLER or ADMIN role. Provided: " + userRole);
        }
    }
}
