package com.stepstyle.catalog.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record UpdateMetricsRequest(
        @DecimalMin(value = "0.0", message = "Average rating cannot be negative")
        @DecimalMax(value = "5.0", message = "Average rating cannot exceed 5.0")
        Double newAvgRating,

        Long reviewCountDelta,

        Long soldCountDelta
) {}
