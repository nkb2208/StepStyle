package com.stepstyle.catalog.dto.response;

public record ProductMetricsResponse(
        Long productId,
        Double avgRating,
        Long reviewCount,
        Long soldCount,
        Double rankingScore
) {}
