package com.stepstyle.catalog.controller;

import com.stepstyle.catalog.config.SecurityUtils;
import com.stepstyle.catalog.dto.request.CreateProductRequest;
import com.stepstyle.catalog.dto.request.UpdateProductRequest;
import com.stepstyle.catalog.dto.response.ProductResponse;
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
@RequestMapping("/api/v1/products")
@Tag(name = "Product Management", description = "Endpoints for creating, updating, viewing, and deleting shoe products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    @Operation(summary = "Create a new product with variants (Requires SELLER or ADMIN)")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Parameter(description = "User role header (SELLER or ADMIN)", required = true)
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Valid @RequestBody CreateProductRequest request) {
        SecurityUtils.verifySellerOrAdmin(userRole);
        ProductResponse response = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created successfully", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing product (Requires SELLER or ADMIN)")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Parameter(description = "User role header (SELLER or ADMIN)", required = true)
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Valid @RequestBody UpdateProductRequest request) {
        SecurityUtils.verifySellerOrAdmin(userRole);
        ProductResponse response = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete a product (Requires SELLER or ADMIN)")
    public ResponseEntity<ApiResponse<Void>> softDeleteProduct(
            @PathVariable Long id,
            @Parameter(description = "User role header (SELLER or ADMIN)", required = true)
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        SecurityUtils.verifySellerOrAdmin(userRole);
        productService.softDeleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully", null));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get detailed product information with variants and metrics (Public)")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductDetail(@PathVariable Long id) {
        ProductResponse response = productService.getProductDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
