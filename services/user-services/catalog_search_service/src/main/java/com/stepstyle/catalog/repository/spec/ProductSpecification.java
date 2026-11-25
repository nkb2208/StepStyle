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

            predicates.add(cb.equal(root.get("status"), ProductStatus.ACTIVE));

            if (criteria == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            if (criteria.keyword() != null && !criteria.keyword().isBlank()) {
                String searchPattern = "%" + criteria.keyword().trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate descMatch = cb.like(cb.lower(root.get("description")), searchPattern);
                predicates.add(cb.or(nameMatch, descMatch));
            }

            if (criteria.brandId() != null) {
                predicates.add(cb.equal(root.get("brand").get("id"), criteria.brandId()));
            }

            if (criteria.categoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("id"), criteria.categoryId()));
            }

            if (criteria.minRating() != null && criteria.minRating() > 0) {
                Join<Product, ProductMetrics> metricsJoin = root.join("metrics", JoinType.LEFT);
                predicates.add(cb.greaterThanOrEqualTo(metricsJoin.get("avgRating"), criteria.minRating()));
            }

            boolean hasVariantFilter = (criteria.size() != null && !criteria.size().isBlank())
                    || (criteria.color() != null && !criteria.color().isBlank())
                    || (criteria.inStockOnly() != null && criteria.inStockOnly())
                    || criteria.minPrice() != null
                    || criteria.maxPrice() != null;

            if (hasVariantFilter) {
                Subquery<Long> variantSubquery = query.subquery(Long.class);
                Root<ProductVariant> variantRoot = variantSubquery.from(ProductVariant.class);

                variantSubquery.select(variantRoot.get("product").get("id"));

                List<Predicate> variantPredicates = new ArrayList<>();

                if (criteria.size() != null && !criteria.size().isBlank()) {
                    variantPredicates.add(cb.equal(
                            cb.lower(variantRoot.get("size")),
                            criteria.size().trim().toLowerCase()
                    ));
                }

                if (criteria.color() != null && !criteria.color().isBlank()) {
                    variantPredicates.add(cb.like(
                            cb.lower(variantRoot.get("color")),
                            "%" + criteria.color().trim().toLowerCase() + "%"
                    ));
                }

                if (criteria.inStockOnly() != null && criteria.inStockOnly()) {
                    variantPredicates.add(cb.greaterThan(variantRoot.get("stockQuantity"), 0));
                }

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

                predicates.add(root.get("id").in(variantSubquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
