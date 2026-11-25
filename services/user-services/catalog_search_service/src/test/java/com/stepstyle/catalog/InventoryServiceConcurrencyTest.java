package com.stepstyle.catalog;

import com.stepstyle.catalog.dto.request.InventoryAdjustRequest;
import com.stepstyle.catalog.dto.response.InventoryAdjustResponse;
import com.stepstyle.catalog.entity.*;
import com.stepstyle.catalog.exception.InsufficientStockException;
import com.stepstyle.catalog.repository.*;
import com.stepstyle.catalog.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("InventoryService Concurrency & Idempotency Integration Tests")
class InventoryServiceConcurrencyTest {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private StockTransactionLogRepository stockTransactionLogRepository;

    private Long testVariantId;

    @BeforeEach
    void setUp() {
        stockTransactionLogRepository.deleteAll();
        productVariantRepository.deleteAll();
        productRepository.deleteAll();
        brandRepository.deleteAll();
        categoryRepository.deleteAll();

        Brand brand = brandRepository.save(new Brand(null, "Nike Test", "https://logo.com/nike.png"));
        Category category = categoryRepository.save(new Category(null, "Running Test", "Running shoes"));

        Product product = new Product(
                null,
                "Nike Air Test",
                "nike-air-test-" + UUID.randomUUID().toString().substring(0, 8),
                brand,
                category,
                "Test shoe description",
                BigDecimal.valueOf(120.00),
                "https://images.com/test.jpg",
                ProductStatus.ACTIVE,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        Product savedProduct = productRepository.save(product);

        ProductVariant variant = new ProductVariant(
                null,
                savedProduct,
                "NK-TEST-" + UUID.randomUUID().toString().substring(0, 8),
                "42",
                "Triple White",
                null,
                3, // Initial stock: strictly 3 items
                0L
        );
        ProductVariant savedVariant = productVariantRepository.save(variant);
        testVariantId = savedVariant.getId();
    }

    @Test
    @DisplayName("Concurrent Deduction: 10 threads concurrently request 1 item with stock=3 -> Exactly 3 succeed, 7 fail with InsufficientStockException, stock reaches exactly 0")
    void testConcurrentInventoryDeduction() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientStockCount = new AtomicInteger(0);
        AtomicInteger unexpectedErrorCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String txId = "tx-concurrent-" + UUID.randomUUID();
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    // All threads wait for the start signal to maximize race contention
                    startLatch.await();

                    InventoryAdjustRequest request = new InventoryAdjustRequest(
                            txId,
                            testVariantId,
                            1,
                            InventoryAction.DEDUCT
                    );

                    inventoryService.adjustInventory(request);
                    successCount.incrementAndGet();
                } catch (InsufficientStockException ise) {
                    insufficientStockCount.incrementAndGet();
                } catch (Exception e) {
                    unexpectedErrorCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Wait until all threads are created and ready
        readyLatch.await(5, TimeUnit.SECONDS);
        // Fire all threads simultaneously
        startLatch.countDown();
        // Await completion
        boolean finished = doneLatch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(finished, "All threads should complete within timeout");
        assertEquals(3, successCount.get(), "Exactly 3 threads must succeed given initial stock = 3");
        assertEquals(7, insufficientStockCount.get(), "Remaining 7 threads must encounter InsufficientStockException");
        assertEquals(0, unexpectedErrorCount.get(), "No unexpected errors should occur");

        // Verify database final state
        ProductVariant finalVariant = productVariantRepository.findById(testVariantId).orElseThrow();
        assertEquals(0, finalVariant.getStockQuantity(), "Final stock must be exactly 0 (no overselling, never negative)");
    }

    @Test
    @DisplayName("Idempotency: Replaying identical transactionId twice must not deduct stock twice and return idempotentReplay=true")
    void testIdempotentDeductionReplay() {
        // Reset stock to 10 for idempotency test
        ProductVariant variant = productVariantRepository.findById(testVariantId).orElseThrow();
        variant.setStockQuantity(10);
        productVariantRepository.saveAndFlush(variant);

        String txId = "tx-idempotent-" + UUID.randomUUID();
        InventoryAdjustRequest request = new InventoryAdjustRequest(
                txId,
                testVariantId,
                2,
                InventoryAction.DEDUCT
        );

        // First call: executes actual deduction
        InventoryAdjustResponse response1 = inventoryService.adjustInventory(request);
        assertNotNull(response1);
        assertFalse(response1.idempotentReplay(), "First call should NOT be an idempotent replay");
        assertEquals(8, response1.currentStock(), "Stock should be deducted from 10 to 8");

        // Second call: duplicate transactionId
        InventoryAdjustResponse response2 = inventoryService.adjustInventory(request);
        assertNotNull(response2);
        assertTrue(response2.idempotentReplay(), "Second call MUST be an idempotent replay");
        assertEquals(8, response2.currentStock(), "Current stock must remain 8");

        // Verify database state: variant stock was only modified once
        ProductVariant reloadedVariant = productVariantRepository.findById(testVariantId).orElseThrow();
        assertEquals(8, reloadedVariant.getStockQuantity(), "Stock in database must be exactly 8 (deducted only once)");

        // Verify transaction log table contains strictly 1 record for this txId
        assertEquals(1, stockTransactionLogRepository.findByVariantIdOrderByCreatedAtDesc(testVariantId).size());
    }
}
