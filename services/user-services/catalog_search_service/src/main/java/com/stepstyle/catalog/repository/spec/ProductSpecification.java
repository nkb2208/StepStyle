package com.stepstyle.catalog.repository.spec;

import com.stepstyle.catalog.entity.Product;
import com.stepstyle.catalog.entity.ProductMetrics;
import com.stepstyle.catalog.entity.ProductStatus;
import com.stepstyle.catalog.entity.ProductVariant;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * High-performance JPA Specification for searching and filtering footwear products.
 *
 * Architecture Guidelines:
 * 1. Only direct filters/joins on Product and ProductMetrics (1-1 Left Join, no row duplication).
 * 2. Variant-level filters (size, color, minPrice, maxPrice, inStockOnly) are evaluated
 *    strictly via a Subquery to ProductVariant (`root.get("id").in(subquery)`).
 *    This completely avoids row multiplication and solves PostgreSQL DISTINCT + ORDER BY paging bugs.
 * 3. Enforces ProductStatus.ACTIVE at all times.
 */
public class ProductSpecification {

    public record ProductSearchCriteria(
            String keyword,
            Long brandId,
            Long categoryId,
            String size,
            String color,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean inStockOnly,
            Double minRating
    ) {}

    public static Specification<Product> filterBy(ProductSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Mandatory condition: Product must be ACTIVE
            predicates.add(cb.equal(root.get("status"), ProductStatus.ACTIVE));

            if (criteria == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            // 2. Keyword search on Product name or description
            if (criteria.keyword() != null && !criteria.keyword().isBlank()) {
                String searchPattern = "%" + criteria.keyword().trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), searchPattern);
                predicates.add(cb.or(nameMatch, descMatch));
            }

            // 3. Brand filter
            if (criteria.brandId() != null) {
                predicates.add(cb.equal(root.get("brand").get("id"), criteria.brandId()));
            }

            // 4. Category filter
            if (criteria.categoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("id"), criteria.categoryId()));
            }

            // 5. Minimum Rating filter (joined with ProductMetrics - 1:1, non-multiplying)
            if (criteria.minRating() != null && criteria.minRating() > 0) {
                Join<Product, ProductMetrics> metricsJoin = root.join("metrics", JoinType.LEFT);
                predicates.add(cb.greaterThanOrEqualTo(metricsJoin.get("avgRating"), criteria.minRating()));
            }

            // 6. Variant-level filters via Subquery to prevent Cartesian product & pagination issues
            boolean hasVariantFilter = (criteria.size() != null && !criteria.size().isBlank())
                    || (criteria.color() != null && !criteria.color().isBlank())
                    || (criteria.inStockOnly() != null && criteria.inStockOnly())
                    || criteria.minPrice() != null
                    || criteria.maxPrice() != null;

            if (hasVariantFilter) {
                Subquery<Long> variantSubquery = query.subquery(Long.class);
                Root<ProductVariant> variantRoot = variantSubquery.from(ProductVariant.class);

                // Correlate variant's product id
                variantSubquery.select(variantRoot.get("product").get("id"));

                List<Predicate> variantPredicates = new ArrayList<>();

                // Size filter
                if (criteria.size() != null && !criteria.size().isBlank()) {
                    variantPredicates.add(cb.equal(
                            cb.lower(variantRoot.get("size")),
                            criteria.size().trim().toLowerCase()
                    ));
                }

                // Color filter
                if (criteria.color() != null && !criteria.color().isBlank()) {
                    variantPredicates.add(cb.like(
                            cb.lower(variantRoot.get("color")),
                            "%" + criteria.color().trim().toLowerCase() + "%"
                    ));
                }

                // In stock filter
                if (criteria.inStockOnly() != null && criteria.inStockOnly()) {
                    variantPredicates.add(cb.greaterThan(variantRoot.get("stockQuantity"), 0));
                }

                // Price range filter on effective price (priceOverride ?? product.basePrice)
                if (criteria.minPrice() != null || criteria.maxPrice() != null) {
                    Expression<BigDecimal> effectivePrice = cb.coalesce(
                            variantRoot.get("priceOverride"),
                            variantRoot.get("product").get("basePrice")
                    );

                    if (criteria.minPrice() != null) {
                        variantPredicates.add(cb.greaterThanOrEqualTo(effectivePrice, criteria.minPrice()));
                    }
                    if (criteria.maxPrice() != null) {
                        variantPredicates.add(cb.lessThanOrEqualTo(effectivePrice, criteria.maxPrice()));
                    }
                }

                variantSubquery.where(cb.and(variantPredicates.toArray(new Predicate[0])));

                // Add IN subquery predicate to main query
                predicates.add(root.get("id").in(variantSubquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
