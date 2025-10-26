package com.laundrypro.jobs.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class AppliedJobResponse {
    Integer applicationId;
    Integer jobId;
    String jobTitle;
    String department;
    String employmentType;
    Integer customerId;
    String customerName;
    String email;
    LocalDateTime appliedDate;
    String status; // new | reviewed | accepted | rejected
}
