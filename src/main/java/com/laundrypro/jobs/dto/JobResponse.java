package com.laundrypro.jobs.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class JobResponse {
    Integer jobId;
    String title;
    String employmentType;
    String department;
    String location;
    String jobDescription;
    LocalDateTime postedDate;
    LocalDateTime expiresAt;
    boolean active;
}
