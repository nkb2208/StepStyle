package com.stepstyle.catalog.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateVariantRequest(
        @NotBlank(message = "SKU cannot be blank")
        @Size(max = 100, message = "SKU cannot exceed 100 characters")
        String sku,

        @NotBlank(message = "Size cannot be blank")
        @Size(max = 20, message = "Size cannot exceed 20 characters")
        String size,

        @NotBlank(message = "Color cannot be blank")
        @Size(max = 50, message = "Color cannot exceed 50 characters")
        String color,

        @DecimalMin(value = "0.01", message = "Price override must be greater than 0")
        BigDecimal priceOverride,

        @NotNull(message = "Stock quantity cannot be null")
        @Min(value = 0, message = "Stock quantity cannot be negative")
        Integer stockQuantity
) {}
