package com.stepstyle.catalog.dto.response;

import com.stepstyle.catalog.entity.ProductStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ProductResponse(
        Long id,
        String name,
        String slug,
        Long brandId,
        String brandName,
        Long categoryId,
        String categoryName,
        String description,
        BigDecimal basePrice,
        String thumbnailUrl,
        ProductStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<VariantResponse> variants,
        ProductMetricsResponse metrics
) {}
