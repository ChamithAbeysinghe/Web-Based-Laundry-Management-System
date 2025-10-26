package com.laundrypro.jobs.dto;

import lombok.Data;

@Data
public class UpdateApplicationStatusRequest {
    private String status; // new | reviewed | accepted | rejected
}
