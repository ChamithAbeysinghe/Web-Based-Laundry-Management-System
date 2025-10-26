package com.laundrypro.jobs.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class CreateOrUpdateJobRequest {
    private String title;
    private String employmentType; // Full-Time | Part-Time | Contract | Internship | Temporary
    private String department;
    private String jobDescription;
    private String location;
    private Boolean active;
    private LocalDate expiresAt; // from UI date input
}
