package com.stepstyle.catalog.service;

import com.stepstyle.catalog.dto.request.ShoeSearchCriteria;
import com.stepstyle.catalog.dto.response.PageResponse;
import com.stepstyle.catalog.dto.response.ProductSummaryResponse;
import com.stepstyle.catalog.entity.Product;
import com.stepstyle.catalog.repository.ProductRepository;
import com.stepstyle.catalog.repository.spec.ProductSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SearchService {

    private final ProductRepository productRepository;

    public SearchService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> searchProducts(ShoeSearchCriteria criteria) {
        Sort sort = resolveSort(criteria.sortBy());
        Pageable pageable = PageRequest.of(criteria.page(), criteria.sizePerPage(), sort);

        ProductSpecification.ProductSearchCriteria specCriteria = new ProductSpecification.ProductSearchCriteria(
                criteria.keyword(),
                criteria.brandId(),
                criteria.categoryId(),
                criteria.size(),
                criteria.color(),
                criteria.minPrice(),
                criteria.maxPrice(),
                criteria.inStockOnly(),
                null // minRating can be added or null
        );

        Specification<Product> spec = ProductSpecification.filterBy(specCriteria);
        Page<Product> productPage = productRepository.findAll(spec, pageable);

        Page<ProductSummaryResponse> responsePage = productPage.map(this::mapToSummaryResponse);
        return PageResponse.from(responsePage);
    }

    private Sort resolveSort(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "metrics.rankingScore");
        }

        String normalized = sortBy.trim().toLowerCase();
        return switch (normalized) {
            case "price,asc" -> Sort.by(Sort.Direction.ASC, "basePrice");
            case "price,desc" -> Sort.by(Sort.Direction.DESC, "basePrice");
            case "soldcount,desc", "sold_count,desc" -> Sort.by(Sort.Direction.DESC, "metrics.soldCount");
            case "createdat,desc", "created_at,desc" -> Sort.by(Sort.Direction.DESC, "createdAt");
            default -> Sort.by(Sort.Direction.DESC, "metrics.rankingScore");
        };
    }

    private ProductSummaryResponse mapToSummaryResponse(Product product) {
        boolean inStock = product.getVariants().stream()
                .anyMatch(v -> v.getStockQuantity() != null && v.getStockQuantity() > 0);

        Double avgRating = 0.0;
        Long reviewCount = 0L;
        Long soldCount = 0L;
        Double rankingScore = 0.0;

        if (product.getMetrics() != null) {
            avgRating = product.getMetrics().getAvgRating();
            reviewCount = product.getMetrics().getReviewCount();
            soldCount = product.getMetrics().getSoldCount();
            rankingScore = product.getMetrics().getRankingScore();
        }

        return new ProductSummaryResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getBrand().getName(),
                product.getCategory().getName(),
                product.getBasePrice(),
                product.getThumbnailUrl(),
                product.getStatus(),
                avgRating,
                reviewCount,
                soldCount,
                rankingScore,
                inStock
        );
    }
}
