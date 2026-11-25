package com.stepstyle.catalog.dto.request;

import com.stepstyle.catalog.entity.InventoryAction;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InventoryAdjustRequest(
        @NotBlank(message = "Transaction ID is required")
        @Size(max = 150, message = "Transaction ID cannot exceed 150 characters")
        String transactionId,

        @NotNull(message = "Variant ID is required")
        Long variantId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity,

        @NotNull(message = "Inventory action is required")
        InventoryAction action
) {}
