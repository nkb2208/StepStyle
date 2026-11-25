package com.stepstyle.catalog.controller;

import com.stepstyle.catalog.config.SecurityUtils;
import com.stepstyle.catalog.dto.request.CreateVariantRequest;
import com.stepstyle.catalog.dto.response.VariantResponse;
import com.stepstyle.catalog.exception.ApiResponse;
import com.stepstyle.catalog.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products/{id}/variants")
@Tag(name = "Product Variant Management", description = "Endpoints for managing shoe variants (size, color, stock, price)")
public class VariantController {

    private final ProductService productService;

    public VariantController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    @Operation(summary = "Add a new variant to an existing product (Requires SELLER or ADMIN)")
    public ResponseEntity<ApiResponse<VariantResponse>> addVariant(
            @PathVariable Long id,
            @Parameter(description = "User role header (SELLER or ADMIN)", required = true)
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Valid @RequestBody CreateVariantRequest request) {
        SecurityUtils.verifySellerOrAdmin(userRole);
        VariantResponse response = productService.addVariant(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Variant added successfully", response));
    }
}
