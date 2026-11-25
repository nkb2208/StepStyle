package com.stepstyle.catalog.dto.response;

import java.math.BigDecimal;

public record VariantResponse(
        Long id,
        Long productId,
        String sku,
        String size,
        String color,
        BigDecimal priceOverride,
        BigDecimal effectivePrice,
        Integer stockQuantity,
        Long version
) {}
