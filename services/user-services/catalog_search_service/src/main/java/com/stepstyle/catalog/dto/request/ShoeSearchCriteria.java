package com.stepstyle.catalog.dto.request;

import java.math.BigDecimal;

public record ShoeSearchCriteria(
        String keyword,
        Long brandId,
        Long categoryId,
        String size,
        String color,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Boolean inStockOnly,
        Integer page,
        Integer sizePerPage,
        String sortBy
) {
    public ShoeSearchCriteria {
        if (page == null || page < 0) {
            page = 0;
        }
        if (sizePerPage == null || sizePerPage <= 0) {
            sizePerPage = 20;
        }
        if (sortBy == null || sortBy.isBlank()) {
            sortBy = "rankingScore,desc";
        }
    }
}
