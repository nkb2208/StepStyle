package com.stepstyle.catalog.dto.response;

import com.stepstyle.catalog.entity.InventoryAction;
import java.time.LocalDateTime;

public record InventoryAdjustResponse(
        String transactionId,
        Long variantId,
        String sku,
        Integer previousStock,
        Integer currentStock,
        InventoryAction action,
        Integer quantity,
        boolean idempotentReplay,
        LocalDateTime timestamp
) {}
