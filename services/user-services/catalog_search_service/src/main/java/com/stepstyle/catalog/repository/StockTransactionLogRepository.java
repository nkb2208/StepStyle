package com.stepstyle.catalog.repository;

import com.stepstyle.catalog.entity.StockTransactionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockTransactionLogRepository extends JpaRepository<StockTransactionLog, Long> {

    boolean existsByTransactionId(String transactionId);

    Optional<StockTransactionLog> findByTransactionId(String transactionId);

    List<StockTransactionLog> findByVariantIdOrderByCreatedAtDesc(Long variantId);
}
