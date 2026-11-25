package com.stepstyle.catalog.repository;

import com.stepstyle.catalog.entity.ProductMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductMetricsRepository extends JpaRepository<ProductMetrics, Long> {

    @Modifying
    @Query("UPDATE ProductMetrics m SET m.soldCount = m.soldCount + :quantity WHERE m.productId = :productId")
    int incrementSoldCount(@Param("productId") Long productId, @Param("quantity") long quantity);

    @Modifying
    @Query("UPDATE ProductMetrics m SET m.rankingScore = :rankingScore WHERE m.productId = :productId")
    int updateRankingScore(@Param("productId") Long productId, @Param("rankingScore") double rankingScore);
}
