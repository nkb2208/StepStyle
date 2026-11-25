package com.stepstyle.catalog.service;

import com.stepstyle.catalog.dto.request.CreateProductRequest;
import com.stepstyle.catalog.dto.request.CreateVariantRequest;
import com.stepstyle.catalog.dto.request.UpdateMetricsRequest;
import com.stepstyle.catalog.dto.request.UpdateProductRequest;
import com.stepstyle.catalog.dto.response.ProductMetricsResponse;
import com.stepstyle.catalog.dto.response.ProductResponse;
import com.stepstyle.catalog.dto.response.VariantResponse;
import com.stepstyle.catalog.entity.*;
import com.stepstyle.catalog.exception.DuplicateResourceException;
import com.stepstyle.catalog.exception.ResourceNotFoundException;
import com.stepstyle.catalog.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductMetricsRepository productMetricsRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final RankingService rankingService;

    public ProductService(ProductRepository productRepository,
                          ProductVariantRepository productVariantRepository,
                          ProductMetricsRepository productMetricsRepository,
                          BrandRepository brandRepository,
                          CategoryRepository categoryRepository,
                          RankingService rankingService) {
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.productMetricsRepository = productMetricsRepository;
        this.brandRepository = brandRepository;
        this.categoryRepository = categoryRepository;
        this.rankingService = rankingService;
    }

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        Brand brand = brandRepository.findById(request.brandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", request.brandId()));

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.categoryId()));

        // Generate and ensure unique slug
        String slug = (request.slug() != null && !request.slug().isBlank())
                ? toSlug(request.slug())
                : toSlug(request.name());

        if (productRepository.existsBySlug(slug)) {
            slug = slug + "-" + UUID.randomUUID().toString().substring(0, 8);
        }

        // Validate variants uniqueness within request
        Set<String> skus = new HashSet<>();
        Set<String> sizeColors = new HashSet<>();
        for (CreateVariantRequest v : request.variants()) {
            if (!skus.add(v.sku().trim().toUpperCase())) {
                throw new DuplicateResourceException("Duplicate SKU in request: " + v.sku());
            }
            String sizeColorKey = v.size().trim().toLowerCase() + "_" + v.color().trim().toLowerCase();
            if (!sizeColors.add(sizeColorKey)) {
                throw new DuplicateResourceException(String.format("Duplicate variant size/color in request: %s - %s", v.size(), v.color()));
            }
            if (productVariantRepository.existsBySku(v.sku().trim())) {
                throw new DuplicateResourceException("ProductVariant", "sku", v.sku());
            }
        }

        Product product = new Product();
        product.setName(request.name().trim());
        product.setSlug(slug);
        product.setBrand(brand);
        product.setCategory(category);
        product.setDescription(request.description());
        product.setBasePrice(request.basePrice());
        product.setThumbnailUrl(request.thumbnailUrl());
        product.setStatus(ProductStatus.ACTIVE);

        // Attach variants
        for (CreateVariantRequest v : request.variants()) {
            ProductVariant variant = new ProductVariant();
            variant.setSku(v.sku().trim());
            variant.setSize(v.size().trim());
            variant.setColor(v.color().trim());
            variant.setPriceOverride(v.priceOverride());
            variant.setStockQuantity(v.stockQuantity());
            product.addVariant(variant);
        }

        Product savedProduct = productRepository.save(product);

        // Initialize ProductMetrics
        double initialRanking = rankingService.calculateRankingScore(0.0, 0L, 0L);
        ProductMetrics metrics = new ProductMetrics(savedProduct, 0.0, 0L, 0L, initialRanking);
        savedProduct.setMetrics(metrics);
        productMetricsRepository.save(metrics);

        return mapToProductResponse(savedProduct);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        product.setName(request.name().trim());

        if (request.brandId() != null) {
            Brand brand = brandRepository.findById(request.brandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", request.brandId()));
            product.setBrand(brand);
        }

        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.categoryId()));
            product.setCategory(category);
        }

        if (request.description() != null) {
            product.setDescription(request.description());
        }

        if (request.basePrice() != null) {
            product.setBasePrice(request.basePrice());
        }

        if (request.thumbnailUrl() != null) {
            product.setThumbnailUrl(request.thumbnailUrl());
        }

        if (request.status() != null) {
            product.setStatus(request.status());
        }

        Product updatedProduct = productRepository.save(product);
        return mapToProductResponse(updatedProduct);
    }

    @Transactional
    public void softDeleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        product.setStatus(ProductStatus.DELETED);
        productRepository.save(product);
    }

    @Transactional
    public VariantResponse addVariant(Long productId, CreateVariantRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (productVariantRepository.existsBySku(request.sku().trim())) {
            throw new DuplicateResourceException("ProductVariant", "sku", request.sku());
        }

        if (productVariantRepository.existsByProductIdAndSizeAndColor(
                productId, request.size().trim(), request.color().trim())) {
            throw new DuplicateResourceException(String.format(
                    "Variant with size '%s' and color '%s' already exists for product ID %d",
                    request.size(), request.color(), productId));
        }

        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku(request.sku().trim());
        variant.setSize(request.size().trim());
        variant.setColor(request.color().trim());
        variant.setPriceOverride(request.priceOverride());
        variant.setStockQuantity(request.stockQuantity());

        ProductVariant savedVariant = productVariantRepository.save(variant);
        return mapToVariantResponse(savedVariant);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductDetail(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return mapToProductResponse(product);
    }

    @Transactional
    public ProductMetricsResponse updateMetrics(Long productId, UpdateMetricsRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        ProductMetrics metrics = productMetricsRepository.findById(productId)
                .orElseGet(() -> {
                    ProductMetrics newMetrics = new ProductMetrics(product, 0.0, 0L, 0L, 0.0);
                    return productMetricsRepository.save(newMetrics);
                });

        if (request.newAvgRating() != null) {
            metrics.setAvgRating(request.newAvgRating());
        }

        long reviewDelta = request.reviewCountDelta() != null ? request.reviewCountDelta() : 0L;
        metrics.setReviewCount(Math.max(0L, metrics.getReviewCount() + reviewDelta));

        long soldDelta = request.soldCountDelta() != null ? request.soldCountDelta() : 0L;
        metrics.setSoldCount(Math.max(0L, metrics.getSoldCount() + soldDelta));

        double newRankingScore = rankingService.calculateRankingScore(
                metrics.getAvgRating(),
                metrics.getReviewCount(),
                metrics.getSoldCount()
        );
        metrics.setRankingScore(newRankingScore);

        ProductMetrics savedMetrics = productMetricsRepository.save(metrics);
        return mapToMetricsResponse(savedMetrics);
    }

    public ProductResponse mapToProductResponse(Product product) {
        List<VariantResponse> variantResponses = product.getVariants().stream()
                .map(this::mapToVariantResponse)
                .collect(Collectors.toList());

        ProductMetricsResponse metricsResponse = product.getMetrics() != null
                ? mapToMetricsResponse(product.getMetrics())
                : new ProductMetricsResponse(product.getId(), 0.0, 0L, 0L, 0.0);

        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getBrand().getId(),
                product.getBrand().getName(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getDescription(),
                product.getBasePrice(),
                product.getThumbnailUrl(),
                product.getStatus(),
                product.getCreatedAt(),
                product.getUpdatedAt(),
                variantResponses,
                metricsResponse
        );
    }

    public VariantResponse mapToVariantResponse(ProductVariant variant) {
        return new VariantResponse(
                variant.getId(),
                variant.getProduct() != null ? variant.getProduct().getId() : null,
                variant.getSku(),
                variant.getSize(),
                variant.getColor(),
                variant.getPriceOverride(),
                variant.getEffectivePrice(),
                variant.getStockQuantity(),
                variant.getVersion()
        );
    }

    public ProductMetricsResponse mapToMetricsResponse(ProductMetrics metrics) {
        return new ProductMetricsResponse(
                metrics.getProductId(),
                metrics.getAvgRating(),
                metrics.getReviewCount(),
                metrics.getSoldCount(),
                metrics.getRankingScore()
        );
    }

    private String toSlug(String input) {
        String nowhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NON_LATIN.matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH).replaceAll("-+", "-").replaceAll("^-|-$", "");
    }
}
