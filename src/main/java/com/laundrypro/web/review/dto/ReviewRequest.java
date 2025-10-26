package com.laundrypro.web.review.dto;

import lombok.Data;

@Data
public class ReviewRequest {
    private Integer customerId;

    // Overall/legacy fields
    private Integer rating;
    private String description;

    // Detailed fields
    private Integer serviceRating;
    private Integer platformRating;
    private String serviceDescription;
    private String platformDescription;
}
