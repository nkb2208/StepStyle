package com.stepstyle.catalog.dto.request;

import com.stepstyle.catalog.entity.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateProductRequest(
        @NotBlank(message = "Product name cannot be blank")
        @Size(max = 255, message = "Product name cannot exceed 255 characters")
        String name,

        Long brandId,

        Long categoryId,

        String description,

        @DecimalMin(value = "0.01", message = "Base price must be greater than 0")
        BigDecimal basePrice,

        String thumbnailUrl,

        ProductStatus status
) {}
