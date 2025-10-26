package com.laundrypro.jobs.web.admin;

import com.laundrypro.jobs.dto.AppliedJobResponse;
import com.laundrypro.jobs.dto.UpdateApplicationStatusRequest;
import com.laundrypro.jobs.service.JobManagementService;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/applied-jobs")
public class AdminAppliedJobsController {

    private final JobManagementService service;

    public AdminAppliedJobsController(JobManagementService service) {
        this.service = service;
    }

    @GetMapping
    public Page<AppliedJobResponse> list(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size,
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
        return service.listApplications(PageRequest.of(page, size, s));
    }

    @PatchMapping("/{applicationId}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable Integer applicationId,
                                             @RequestBody UpdateApplicationStatusRequest req) {
        service.updateApplicationStatus(applicationId, req.getStatus());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{applicationId}")
    public ResponseEntity<Void> delete(@PathVariable Integer applicationId) {
        service.deleteApplication(applicationId);
        return ResponseEntity.noContent().build();
    }
}
