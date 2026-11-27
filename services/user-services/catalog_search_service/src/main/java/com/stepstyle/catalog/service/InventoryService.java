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

    public InventoryAdjustResponse adjustInventory(InventoryAdjustRequest request) {

        Optional<StockTransactionLog> existingTx = stockTransactionLogRepository.findByTransactionId(request.transactionId());
        if (existingTx.isPresent()) {
            return buildReplayResponse(existingTx.get(), request.variantId());
        }

        try {
            return transactionTemplate.execute(status -> executeAdjustment(request));
        } catch (DataIntegrityViolationException dive) {
            log.warn("Concurrent duplicate transaction ID detected for tx: {}. Returning idempotent replay.",
                    request.transactionId());

            return stockTransactionLogRepository.findByTransactionId(request.transactionId())
                    .map(tx -> buildReplayResponse(tx, request.variantId()))
                    .orElseThrow(() -> dive);
        }
    }

    private InventoryAdjustResponse executeAdjustment(InventoryAdjustRequest request) {

        Optional<StockTransactionLog> existingTx = stockTransactionLogRepository.findByTransactionId(request.transactionId());
        if (existingTx.isPresent()) {
            return buildReplayResponse(existingTx.get(), request.variantId());
        }

        ProductVariant variant = productVariantRepository.findByIdForUpdate(request.variantId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", request.variantId()));

        int previousStock = variant.getStockQuantity();
        int requestedQuantity = request.quantity();
        InventoryAction action = request.action();

        if (action == InventoryAction.DEDUCT || action == InventoryAction.RESERVE) {
            if (previousStock < requestedQuantity) {
                throw new InsufficientStockException(variant.getId(), requestedQuantity, previousStock);
            }
            variant.setStockQuantity(previousStock - requestedQuantity);
        } else if (action == InventoryAction.RELEASE) {
            variant.setStockQuantity(previousStock + requestedQuantity);
        }

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
