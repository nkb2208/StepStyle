package com.stepstyle.catalog.controller;

import com.stepstyle.catalog.dto.request.ShoeSearchCriteria;
import com.stepstyle.catalog.dto.response.PageResponse;
import com.stepstyle.catalog.dto.response.ProductSummaryResponse;
import com.stepstyle.catalog.exception.ApiResponse;
import com.stepstyle.catalog.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/products/search")
@Tag(name = "Product Catalog & Search", description = "Public search endpoint with multi-criteria filtering and Bayesian ranking priority")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    @Operation(summary = "Search products by keyword, brand, category, size, color, price range, and stock with prioritized ranking")
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> searchProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean inStockOnly,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "20") Integer sizePerPage,
            @RequestParam(defaultValue = "rankingScore,desc") String sortBy) {

        ShoeSearchCriteria criteria = new ShoeSearchCriteria(
                keyword,
                brandId,
                categoryId,
                size,
                color,
                minPrice,
                maxPrice,
                inStockOnly,
                page,
                sizePerPage,
                sortBy
        );

        PageResponse<ProductSummaryResponse> response = searchService.searchProducts(criteria);
        return ResponseEntity.ok(ApiResponse.success("Search completed successfully", response));
    }
}
