package com.stepstyle.catalog.entity;

import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "product_metrics")
public class ProductMetrics {

    @Id
    @Column(name = "product_id")
    private Long productId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "avg_rating", nullable = false)
    private Double avgRating = 0.0;

    @Column(name = "review_count", nullable = false)
    private Long reviewCount = 0L;

    @Column(name = "sold_count", nullable = false)
    private Long soldCount = 0L;

    @Column(name = "ranking_score", nullable = false)
    private Double rankingScore = 0.0;

    public ProductMetrics() {
    }

    public ProductMetrics(Product product, Double avgRating, Long reviewCount, Long soldCount, Double rankingScore) {
        this.product = product;
        if (product != null) {
            this.productId = product.getId();
        }
        this.avgRating = avgRating != null ? avgRating : 0.0;
        this.reviewCount = reviewCount != null ? reviewCount : 0L;
        this.soldCount = soldCount != null ? soldCount : 0L;
        this.rankingScore = rankingScore != null ? rankingScore : 0.0;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
        if (product != null) {
            this.productId = product.getId();
        }
    }

    public Double getAvgRating() {
        return avgRating;
    }

    public void setAvgRating(Double avgRating) {
        this.avgRating = avgRating;
    }

    public Long getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Long reviewCount) {
        this.reviewCount = reviewCount;
    }

    public Long getSoldCount() {
        return soldCount;
    }

    public void setSoldCount(Long soldCount) {
        this.soldCount = soldCount;
    }

    public Double getRankingScore() {
        return rankingScore;
    }

    public void setRankingScore(Double rankingScore) {
        this.rankingScore = rankingScore;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductMetrics that)) return false;
        return Objects.equals(productId, that.productId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId);
    }
}
