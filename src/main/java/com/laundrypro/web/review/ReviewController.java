package com.laundrypro.web.review;

import com.laundrypro.model.Review;
import com.laundrypro.service.ReviewService;
import com.laundrypro.web.review.dto.ReviewRequest;
import com.laundrypro.web.review.dto.ReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> create(@RequestBody ReviewRequest request) {
        Review saved = reviewService.create(request);
        return ResponseEntity
                .created(URI.create("/api/reviews/" + saved.getReviewId()))
                .body(new ReviewResponse(saved.getReviewId(), "Review submitted"));
    }

    @GetMapping
    public ResponseEntity<Page<Review>> getAll(Pageable pageable) {
        return ResponseEntity.ok(reviewService.getAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Review> getOne(@PathVariable Integer id) {
        Review r = reviewService.getOne(id);
        return r != null ? ResponseEntity.ok(r) : ResponseEntity.notFound().build();
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Review>> getByCustomer(@PathVariable Integer customerId) {
        return ResponseEntity.ok(reviewService.getByCustomer(customerId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        reviewService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/admin/reviews/{reviewId}/status")
    public ResponseEntity<Review> updateStatus(@PathVariable Integer reviewId, @RequestBody StatusRequest request) {
        Review updated = reviewService.updateReviewStatus(reviewId, request.getStatus());
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/admin/reviews/{id}/status")
    public ResponseEntity<Review> updateStatus(@PathVariable Integer id, @RequestBody String status) {
        Review updated = reviewService.updateReviewStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    public static class StatusRequest {
        private String status;
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
