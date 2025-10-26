package com.laundrypro.jobs.web;

import com.laundrypro.jobs.dto.AppliedJobResponse;
import com.laundrypro.jobs.service.JobManagementService;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/applied-jobs")
public class CustomerAppliedJobsController {

    private final JobManagementService service;

    public CustomerAppliedJobsController(JobManagementService service) {
        this.service = service;
    }

    @GetMapping("/customer/{customerId}")
    public Page<AppliedJobResponse> listForCustomer(@PathVariable Integer customerId,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "50") int size,
                                                    @RequestParam(defaultValue = "appliedDate,DESC") String sort) {
        Sort s = Sort.by(Sort.Order.desc("appliedDate"));
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            if (parts.length >= 1) {
                String prop = parts[0];
                boolean asc = parts.length < 2 || !"DESC".equalsIgnoreCase(parts[1]);
                s = asc ? Sort.by(prop).ascending() : Sort.by(prop).descending();
            }
        }
        return service.listCustomerApplications(customerId, PageRequest.of(page, size, s));
    }

    // A simple apply endpoint your Job_application.js could call after enforcing login
    @PostMapping("/apply")
    public ResponseEntity<AppliedJobResponse> apply(@RequestParam Integer customerId,
                                                    @RequestParam Integer jobId) {
        return ResponseEntity.ok(service.applyToJob(customerId, jobId));
    }
}
