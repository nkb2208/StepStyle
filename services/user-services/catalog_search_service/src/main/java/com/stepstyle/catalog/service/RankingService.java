package com.stepstyle.catalog.service;

import com.stepstyle.catalog.config.RankingProperties;
import org.springframework.stereotype.Service;

@Service
public class RankingService {

    private final RankingProperties rankingProperties;

    public RankingService(RankingProperties rankingProperties) {
        this.rankingProperties = rankingProperties;
    }

    public double calculateRankingScore(Double avgRating, Long reviewCount, Long soldCount) {
        double safeRating = (avgRating != null && avgRating > 0.0) ? avgRating : 0.0;
        long safeReviews = (reviewCount != null && reviewCount > 0L) ? reviewCount : 0L;
        long safeSold = (soldCount != null && soldCount > 0L) ? soldCount : 0L;

        double c = rankingProperties.getPriorMean();
        double m = rankingProperties.getMinReviews();
        double w1 = rankingProperties.getRatingWeight();
        double w2 = rankingProperties.getSoldWeight();
        double w3 = rankingProperties.getReviewWeight();

        double weightedRating = (safeReviews * safeRating + m * c) / (safeReviews + m);

        double logSold = Math.log(1.0 + safeSold);
        double logReview = Math.log(1.0 + safeReviews);

        double score = (w1 * weightedRating) + (w2 * logSold) + (w3 * logReview);

        return Math.round(score * 100.0) / 100.0;
    }
}
