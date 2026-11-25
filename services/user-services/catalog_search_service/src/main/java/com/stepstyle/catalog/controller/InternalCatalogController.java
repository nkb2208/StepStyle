package com.stepstyle.catalog.controller;

import com.stepstyle.catalog.dto.request.InventoryAdjustRequest;
import com.stepstyle.catalog.dto.request.UpdateMetricsRequest;
import com.stepstyle.catalog.dto.response.InventoryAdjustResponse;
import com.stepstyle.catalog.dto.response.ProductMetricsResponse;
import com.stepstyle.catalog.exception.ApiResponse;
import com.stepstyle.catalog.service.InventoryService;
import com.stepstyle.catalog.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/internal")
@Tag(name = "Internal Catalog & Inventory API", description = "Internal service-to-service endpoints for Order & Review services")
public class InternalCatalogController {

    private final InventoryService inventoryService;
    private final ProductService productService;

    public InternalCatalogController(InventoryService inventoryService, ProductService productService) {
        this.inventoryService = inventoryService;
        this.productService = productService;
    }

    @PostMapping("/inventory/adjust")
    @Operation(summary = "Adjust stock quantity with pessimistic locking and idempotent replay (Internal)")
    public ResponseEntity<ApiResponse<InventoryAdjustResponse>> adjustInventory(
            @Valid @RequestBody InventoryAdjustRequest request) {
        InventoryAdjustResponse response = inventoryService.adjustInventory(request);
        return ResponseEntity.ok(ApiResponse.success("Inventory adjusted successfully", response));
    }

    @PostMapping("/products/{id}/metrics")
    @Operation(summary = "Update product ratings, sold count, and recompute ranking score (Internal)")
    public ResponseEntity<ApiResponse<ProductMetricsResponse>> updateMetrics(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMetricsRequest request) {
        ProductMetricsResponse response = productService.updateMetrics(id, request);
        return ResponseEntity.ok(ApiResponse.success("Product metrics updated successfully", response));
    }
}
