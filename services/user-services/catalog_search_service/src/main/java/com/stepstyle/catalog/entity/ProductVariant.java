package com.stepstyle.catalog.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Objects;

@Entity
@Table(
    name = "product_variants",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_product_size_color", columnNames = {"product_id", "size", "color"})
    }
)
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "sku", nullable = false, unique = true, length = 100)
    private String sku;

    @Column(name = "size", nullable = false, length = 20)
    private String size;

    @Column(name = "color", nullable = false, length = 50)
    private String color;

    @Column(name = "price_override", precision = 12, scale = 2)
    private BigDecimal priceOverride;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity = 0;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public ProductVariant() {
    }

    public ProductVariant(Long id, Product product, String sku, String size, String color,
                          BigDecimal priceOverride, Integer stockQuantity, Long version) {
        this.id = id;
        this.product = product;
        this.sku = sku;
        this.size = size;
        this.color = color;
        this.priceOverride = priceOverride;
        this.stockQuantity = stockQuantity != null ? stockQuantity : 0;
        this.version = version != null ? version : 0L;
    }

    public BigDecimal getEffectivePrice() {
        if (priceOverride != null) {
            return priceOverride;
        }
        return product != null ? product.getBasePrice() : null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public BigDecimal getPriceOverride() {
        return priceOverride;
    }

    public void setPriceOverride(BigDecimal priceOverride) {
        this.priceOverride = priceOverride;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductVariant that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
