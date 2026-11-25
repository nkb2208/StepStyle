package com.stepstyle.catalog.service;

import com.stepstyle.catalog.config.RankingProperties;
import org.springframework.stereotype.Service;

@Service
public class RankingService {

    private final RankingProperties rankingProperties;

    public RankingService(RankingProperties rankingProperties) {
        this.rankingProperties = rankingProperties;
    }

    /**
     * Computes the compound ranking score using Bayesian weighted rating and log-scaled volume.
     * Formula:
     * weightedRating = (reviewCount * avgRating + m * C) / (reviewCount + m)
     * rankingScore = w1 * weightedRating + w2 * ln(1 + soldCount) + w3 * ln(1 + reviewCount)
     *
     * Gracefully handles null avgRating or non-positive reviewCount (defaults to 0.0 and 0L).
     */
    public double calculateRankingScore(Double avgRating, Long reviewCount, Long soldCount) {
        double safeRating = (avgRating != null && avgRating > 0.0) ? avgRating : 0.0;
        long safeReviews = (reviewCount != null && reviewCount > 0L) ? reviewCount : 0L;
        long safeSold = (soldCount != null && soldCount > 0L) ? soldCount : 0L;

        double c = rankingProperties.getPriorMean();
        double m = rankingProperties.getMinReviews();
        double w1 = rankingProperties.getRatingWeight();
        double w2 = rankingProperties.getSoldWeight();
        double w3 = rankingProperties.getReviewWeight();

        // Denominator (safeReviews + m) is strictly positive because m >= 1.0
        double weightedRating = (safeReviews * safeRating + m * c) / (safeReviews + m);

        double logSold = Math.log(1.0 + safeSold);
        double logReview = Math.log(1.0 + safeReviews);

        double score = (w1 * weightedRating) + (w2 * logSold) + (w3 * logReview);

        // Round to 2 decimal places for clean storage and display
        return Math.round(score * 100.0) / 100.0;
    }
}
