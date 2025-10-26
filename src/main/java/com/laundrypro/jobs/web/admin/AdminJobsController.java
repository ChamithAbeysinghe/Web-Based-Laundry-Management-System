package com.laundrypro.jobs.web.admin;

import com.laundrypro.jobs.dto.CreateOrUpdateJobRequest;
import com.laundrypro.jobs.dto.JobResponse;
import com.laundrypro.jobs.service.JobManagementService;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/jobs")
 @CrossOrigin(origins = "*")
public class AdminJobsController {

    private final JobManagementService service;

    public AdminJobsController(JobManagementService service) {
        this.service = service;
    }

    @GetMapping
    public Page<JobResponse> list(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  @RequestParam(defaultValue = "postedDate,DESC") String sort) {
        Sort s = Sort.by(Sort.Order.desc("postedDate"));
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            if (parts.length >= 1) {
                String prop = parts[0];
                boolean asc = parts.length < 2 || !"DESC".equalsIgnoreCase(parts[1]);
                s = asc ? Sort.by(prop).ascending() : Sort.by(prop).descending();
            }
        }
        return service.listJobs(PageRequest.of(page, size, s));
    }

    @PostMapping
    public ResponseEntity<JobResponse> create(@RequestBody CreateOrUpdateJobRequest req) {
        return ResponseEntity.ok(service.createJob(req));
    }

    @PutMapping("/{jobId}")
    public ResponseEntity<JobResponse> update(@PathVariable Integer jobId,
                                              @RequestBody CreateOrUpdateJobRequest req) {
        return ResponseEntity.ok(service.updateJob(jobId, req));
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> delete(@PathVariable Integer jobId) {
        service.deleteJob(jobId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{jobId}/status")
    public ResponseEntity<Void> setActive(@PathVariable Integer jobId,
                                          @RequestParam boolean active) {
        service.setJobActive(jobId, active);
        return ResponseEntity.noContent().build();
    }
}
