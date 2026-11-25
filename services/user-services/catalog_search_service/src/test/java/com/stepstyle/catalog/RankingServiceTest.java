package com.stepstyle.catalog;

import com.stepstyle.catalog.config.RankingProperties;
import com.stepstyle.catalog.service.RankingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("RankingService Unit Tests - Bayesian Rating & Priority Scoring")
class RankingServiceTest {

    private RankingService rankingService;
    private RankingProperties rankingProperties;

    @BeforeEach
    void setUp() {
        rankingProperties = new RankingProperties(3.5, 10.0, 2.0, 1.5, 1.0);
        rankingService = new RankingService(rankingProperties);
    }

    @Test
    @DisplayName("Should safely compute baseline score for unrated product without NaN or division by zero")
    void testZeroReviewsAndZeroSales() {
        double score = rankingService.calculateRankingScore(0.0, 0L, 0L);

        // weightedRating = (0 * 0.0 + 10.0 * 3.5) / 10.0 = 3.5
        // logSold = ln(1 + 0) = 0.0, logReview = ln(1 + 0) = 0.0
        // score = 2.0 * 3.5 + 0 + 0 = 7.00
        assertEquals(7.00, score, 0.01, "Baseline score for brand new product should equal 2 * priorMean");
        assertFalse(Double.isNaN(score), "Score must never be NaN");
        assertFalse(Double.isInfinite(score), "Score must never be infinite");
    }

    @Test
    @DisplayName("Should safely handle null rating and negative count values")
    void testNullRatingAndNegativeValues() {
        double score = rankingService.calculateRankingScore(null, -5L, -10L);

        assertEquals(7.00, score, 0.01, "Negative inputs should be bounded to 0 without errors");
        assertFalse(Double.isNaN(score));
    }

    @Test
    @DisplayName("Bayesian damping: Product with 2 five-star reviews should rank lower than popular proven shoe")
    void testBayesianDampingOnLowSample() {
        // Shoe A: 2 reviews, 5.0 stars, 5 sold
        double scoreA = rankingService.calculateRankingScore(5.0, 2L, 5L);

        // Shoe B: 500 reviews, 4.6 stars, 1500 sold
        double scoreB = rankingService.calculateRankingScore(4.6, 500L, 1500L);

        assertTrue(scoreB > scoreA,
                String.format("High-volume reliable product (score: %.2f) must outrank low-sample 5-star product (score: %.2f)",
                        scoreB, scoreA));
    }

    @Test
    @DisplayName("Ranking order: Higher rating, more reviews, and higher sales yield higher ranking score")
    void testProgressiveRankingGrowth() {
        double unrated = rankingService.calculateRankingScore(0.0, 0L, 0L);
        double moderate = rankingService.calculateRankingScore(4.2, 50L, 120L);
        double bestSeller = rankingService.calculateRankingScore(4.8, 5000L, 25000L);

        assertTrue(moderate > unrated, "Moderate product should score higher than unrated product");
        assertTrue(bestSeller > moderate, "Best seller should score significantly higher than moderate product");
    }
}
