package com.stepstyle.catalog.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.ranking")
public class RankingProperties {

    private double priorMean = 3.5;

    private double minReviews = 10.0;

    private double ratingWeight = 2.0;

    private double soldWeight = 1.5;

    private double reviewWeight = 1.0;

    public RankingProperties() {
    }

    public RankingProperties(double priorMean, double minReviews, double ratingWeight, double soldWeight, double reviewWeight) {
        this.priorMean = priorMean;
        this.minReviews = minReviews;
        this.ratingWeight = ratingWeight;
        this.soldWeight = soldWeight;
        this.reviewWeight = reviewWeight;
    }

    public double getPriorMean() {
        return priorMean;
    }

    public void setPriorMean(double priorMean) {
        this.priorMean = priorMean;
    }

    public double getMinReviews() {
        return minReviews;
    }

    public void setMinReviews(double minReviews) {
        this.minReviews = minReviews;
    }

    public double getRatingWeight() {
        return ratingWeight;
    }

    public void setRatingWeight(double ratingWeight) {
        this.ratingWeight = ratingWeight;
    }

    public double getSoldWeight() {
        return soldWeight;
    }

    public void setSoldWeight(double soldWeight) {
        this.soldWeight = soldWeight;
    }

    public double getReviewWeight() {
        return reviewWeight;
    }

    public void setReviewWeight(double reviewWeight) {
        this.reviewWeight = reviewWeight;
    }

    public double computeScore(double avgRating, long reviewCount, long soldCount) {
        double bayesianRating = (reviewCount * avgRating + minReviews * priorMean) / (reviewCount + minReviews);
        double logSold = Math.log(1.0 + Math.max(0, soldCount));
        double logReview = Math.log(1.0 + Math.max(0, reviewCount));

        return (ratingWeight * bayesianRating) + (soldWeight * logSold) + (reviewWeight * logReview);
    }
}
