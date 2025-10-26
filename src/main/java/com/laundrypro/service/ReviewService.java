package com.laundrypro.service;

import com.laundrypro.model.Review;
import com.laundrypro.repository.ReviewRepository;
import com.laundrypro.web.review.dto.ReviewRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;

    public ReviewService(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public Review create(ReviewRequest req) {
        if (req == null) throw new IllegalArgumentException("Review request is required");
        if (req.getCustomerId() == null) throw new IllegalArgumentException("Customer ID is required");

        Review review = Review.builder()
                .customerId(req.getCustomerId())
                .description(req.getDescription() != null ? req.getDescription() : req.getServiceDescription())
                .rating(req.getRating() != null ? req.getRating() : req.getServiceRating())
                .serviceRating(req.getServiceRating())
                .platformRating(req.getPlatformRating())
                .serviceDescription(req.getServiceDescription())
                .platformDescription(req.getPlatformDescription())
                .createdAt(LocalDateTime.now())
                .status("pending") // Set default status
                .build();

        return reviewRepository.save(review);
    }

    public Page<Review> getAll(Pageable pageable) {
        return reviewRepository.findAll(pageable);
    }

    public Review getOne(Integer id) {
        return reviewRepository.findById(id).orElse(null);
    }

    public List<Review> getByCustomer(Integer customerId) {
        return reviewRepository.findByCustomerId(customerId);
    }

    public Review save(Review review) {
        if (review.getCreatedAt() == null) review.setCreatedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    public void delete(Integer id) {
        reviewRepository.deleteById(id);
    }

    public Review updateReviewStatus(Integer reviewId, String status) {
        Review review = getOne(reviewId);
        if (review == null) throw new IllegalArgumentException("Review not found");
        review.setStatus(status);
        return reviewRepository.save(review);
    }
}
