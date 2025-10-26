package com.laundrypro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "Review")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Review_ID")
    private Integer reviewId;

    @Column(name = "Customer_ID", nullable = false)
    private Integer customerId;

    @Column(name = "Description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "Rating")
    private Integer rating;

    @Column(name = "Service_Rating")
    private Integer serviceRating;

    @Column(name = "Platform_Rating")
    private Integer platformRating;

    @Column(name = "Service_Description", columnDefinition = "TEXT")
    private String serviceDescription;

    @Column(name = "Platform_Description", columnDefinition = "TEXT")
    private String platformDescription;

    @Column(name = "Created_At")
    private LocalDateTime createdAt;

    @Column(name = "Status")
    private String status;
}
