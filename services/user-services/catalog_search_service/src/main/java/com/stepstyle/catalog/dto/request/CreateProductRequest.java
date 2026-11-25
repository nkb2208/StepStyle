package com.stepstyle.catalog.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreateProductRequest(
        @NotBlank(message = "Product name cannot be blank")
        @Size(max = 255, message = "Product name cannot exceed 255 characters")
        String name,

        String slug,

        @NotNull(message = "Brand ID is required")
        Long brandId,

        @NotNull(message = "Category ID is required")
        Long categoryId,

        String description,

        @NotNull(message = "Base price is required")
        @DecimalMin(value = "0.01", message = "Base price must be greater than 0")
        BigDecimal basePrice,

        String thumbnailUrl,

        @NotEmpty(message = "Product must have at least one variant")
        @Valid
        List<CreateVariantRequest> variants
) {}
