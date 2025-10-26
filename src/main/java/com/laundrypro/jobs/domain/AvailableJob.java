package com.laundrypro.jobs.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Available_Jobs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvailableJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "JobID")
    private Integer jobId;

    @Column(name = "Job_Title", nullable = false, length = 255)
    private String title;

    @Column(name = "Employment_Type", length = 60)
    private String employmentType; // Full-Time | Part-Time | Contract | Internship | Temporary

    @Column(name = "Department", length = 100)
    private String department;

    @Lob
    @Column(name = "Job_Description")
    private String jobDescription;

    @Column(name = "Location", length = 100)
    private String location;

    @Column(name = "Posted_Date", nullable = false)
    private LocalDateTime postedDate;

    @Column(name = "Expires_At")
    private LocalDateTime expiresAt;

    @Column(name = "Is_Active", nullable = false)
    private boolean active;

    @PrePersist
    public void prePersist() {
        if (postedDate == null) postedDate = LocalDateTime.now();
    }
}
