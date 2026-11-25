package com.stepstyle.catalog.service;

import com.stepstyle.catalog.dto.request.InventoryAdjustRequest;
import com.stepstyle.catalog.dto.response.InventoryAdjustResponse;
import com.stepstyle.catalog.entity.InventoryAction;
import com.stepstyle.catalog.entity.ProductVariant;
import com.stepstyle.catalog.entity.StockTransactionLog;
import com.stepstyle.catalog.exception.InsufficientStockException;
import com.stepstyle.catalog.exception.ResourceNotFoundException;
import com.stepstyle.catalog.repository.ProductVariantRepository;
import com.stepstyle.catalog.repository.StockTransactionLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);

    private final ProductVariantRepository productVariantRepository;
    private final StockTransactionLogRepository stockTransactionLogRepository;
    private final TransactionTemplate transactionTemplate;

    public InventoryService(ProductVariantRepository productVariantRepository,
                            StockTransactionLogRepository stockTransactionLogRepository,
                            PlatformTransactionManager transactionManager) {
        this.productVariantRepository = productVariantRepository;
        this.stockTransactionLogRepository = stockTransactionLogRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Adjusts inventory with pessimistic locking and strict idempotency.
     * If a concurrent duplicate transactionId causes DataIntegrityViolationException,
     * the change is safely rolled back and the existing transaction state is returned.
     */
    public InventoryAdjustResponse adjustInventory(InventoryAdjustRequest request) {
        // Step 1: Check existing transaction for fast idempotent replay
        Optional<StockTransactionLog> existingTx = stockTransactionLogRepository.findByTransactionId(request.transactionId());
        if (existingTx.isPresent()) {
            return buildReplayResponse(existingTx.get(), request.variantId());
        }

        // Step 2 & 5: Execute atomic adjustment in isolated transaction boundary to handle concurrency
        try {
            return transactionTemplate.execute(status -> executeAdjustment(request));
        } catch (DataIntegrityViolationException dive) {
            log.warn("Concurrent duplicate transaction ID detected for tx: {}. Returning idempotent replay.",
                    request.transactionId());

            // Re-read existing transaction committed by concurrent thread
            return stockTransactionLogRepository.findByTransactionId(request.transactionId())
                    .map(tx -> buildReplayResponse(tx, request.variantId()))
                    .orElseThrow(() -> dive);
        }
    }

    private InventoryAdjustResponse executeAdjustment(InventoryAdjustRequest request) {
        // Double check inside transaction boundary
        Optional<StockTransactionLog> existingTx = stockTransactionLogRepository.findByTransactionId(request.transactionId());
        if (existingTx.isPresent()) {
            return buildReplayResponse(existingTx.get(), request.variantId());
        }

        // Step 2: Pessimistic write lock on variant
        ProductVariant variant = productVariantRepository.findByIdForUpdate(request.variantId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", request.variantId()));

        int previousStock = variant.getStockQuantity();
        int requestedQuantity = request.quantity();
        InventoryAction action = request.action();

        // Step 3 & 4: Evaluate action and stock availability
        if (action == InventoryAction.DEDUCT || action == InventoryAction.RESERVE) {
            if (previousStock < requestedQuantity) {
                throw new InsufficientStockException(variant.getId(), requestedQuantity, previousStock);
            }
            variant.setStockQuantity(previousStock - requestedQuantity);
        } else if (action == InventoryAction.RELEASE) {
            variant.setStockQuantity(previousStock + requestedQuantity);
        }

        // Step 5: Save log and updated variant
        StockTransactionLog logEntry = new StockTransactionLog(
                request.transactionId(),
                variant.getId(),
                action,
                requestedQuantity
        );

        stockTransactionLogRepository.saveAndFlush(logEntry);
        productVariantRepository.saveAndFlush(variant);

        return new InventoryAdjustResponse(
                logEntry.getTransactionId(),
                variant.getId(),
                variant.getSku(),
                previousStock,
                variant.getStockQuantity(),
                action,
                requestedQuantity,
                false,
                logEntry.getCreatedAt()
        );
    }

    private InventoryAdjustResponse buildReplayResponse(StockTransactionLog existingTx, Long fallbackVariantId) {
        Long variantId = existingTx.getVariantId() != null ? existingTx.getVariantId() : fallbackVariantId;
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", variantId));

        return new InventoryAdjustResponse(
                existingTx.getTransactionId(),
                variant.getId(),
                variant.getSku(),
                variant.getStockQuantity(),
                variant.getStockQuantity(),
                existingTx.getAction(),
                existingTx.getQuantity(),
                true,
                existingTx.getCreatedAt()
        );
    }
}
