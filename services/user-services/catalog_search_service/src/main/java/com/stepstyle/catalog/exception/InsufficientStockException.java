package com.stepstyle.catalog.exception;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(String message) {
        super(message);
    }

    public InsufficientStockException(Long variantId, int requested, int available) {
        super(String.format("Insufficient stock for variant ID %d: requested %d, but only %d available",
                variantId, requested, available));
    }
}
