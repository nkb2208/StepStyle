package com.stepstyle.catalog.dto.response;

import com.stepstyle.catalog.entity.ProductStatus;
import java.math.BigDecimal;

public record ProductSummaryResponse(
        Long id,
        String name,
        String slug,
        String brandName,
        String categoryName,
        BigDecimal basePrice,
        String thumbnailUrl,
        ProductStatus status,
        Double avgRating,
        Long reviewCount,
        Long soldCount,
        Double rankingScore,
        boolean inStock
) {}
