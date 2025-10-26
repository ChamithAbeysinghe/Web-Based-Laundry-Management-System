package com.laundrypro.web.review.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReviewResponse {
    private Integer reviewId;
    private String message;
}
