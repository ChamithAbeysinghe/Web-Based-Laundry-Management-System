package com.laundrypro.jobs.service;

import com.laundrypro.model.Customer;
import com.laundrypro.repository.CustomerRepository;
import com.laundrypro.jobs.domain.AppliedJob;
import com.laundrypro.jobs.domain.AvailableJob;
import com.laundrypro.jobs.dto.*;
import com.laundrypro.jobs.repo.AppliedJobRepository;
import com.laundrypro.jobs.repo.AvailableJobRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class JobManagementService {

    private final AvailableJobRepository availableJobRepository;
    private final AppliedJobRepository appliedJobRepository;
    private final CustomerRepository customerRepository;

    public JobManagementService(AvailableJobRepository availableJobRepository,
                                AppliedJobRepository appliedJobRepository,
                                CustomerRepository customerRepository) {
        this.availableJobRepository = availableJobRepository;
        this.appliedJobRepository = appliedJobRepository;
        this.customerRepository = customerRepository;
    }

    // Jobs
    public Page<JobResponse> listJobs(Pageable pageable) {
        return availableJobRepository.findAll(pageable).map(this::toJobResponse);
    }

    public JobResponse createJob(CreateOrUpdateJobRequest req) {
        AvailableJob job = AvailableJob.builder()
                .title(req.getTitle())
                .employmentType(req.getEmploymentType())
                .department(req.getDepartment())
                .jobDescription(req.getJobDescription())
                .location(req.getLocation())
                .postedDate(LocalDateTime.now())
                .expiresAt(req.getExpiresAt() != null ? req.getExpiresAt().atStartOfDay() : null)
                .active(req.getActive() == null ? true : req.getActive())
                .build();
        return toJobResponse(availableJobRepository.save(job));
    }

    public JobResponse updateJob(Integer jobId, CreateOrUpdateJobRequest req) {
        AvailableJob job = availableJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        job.setTitle(req.getTitle());
        job.setEmploymentType(req.getEmploymentType());
        job.setDepartment(req.getDepartment());
        job.setJobDescription(req.getJobDescription());
        job.setLocation(req.getLocation());
        job.setExpiresAt(req.getExpiresAt() != null ? req.getExpiresAt().atStartOfDay() : null);
        if (req.getActive() != null) job.setActive(req.getActive());
        return toJobResponse(availableJobRepository.save(job));
    }

    public void deleteJob(Integer jobId) {
        // First, check if the job exists
        AvailableJob job = availableJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        // Delete all applications associated with this job first
        List<AppliedJob> applications = appliedJobRepository.findByJob(job);
        if (!applications.isEmpty()) {
            appliedJobRepository.deleteAll(applications);
        }

        // Now delete the job
        availableJobRepository.deleteById(jobId);
    }

    public void setJobActive(Integer jobId, boolean active) {
        AvailableJob job = availableJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        job.setActive(active);
        availableJobRepository.save(job);
    }

    // Applications (Admin)
    public Page<AppliedJobResponse> listApplications(Pageable pageable) {
        return appliedJobRepository.findAll(pageable).map(this::toAppliedJobResponse);
    }

    public void updateApplicationStatus(Integer applicationId, String status) {
        String s = status == null ? "new" : status.toLowerCase();
        if (!s.matches("new|reviewed|accepted|rejected")) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }
        AppliedJob app = appliedJobRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));
        app.setStatus(s);
        appliedJobRepository.save(app);
    }

    public void deleteApplication(Integer applicationId) {
        appliedJobRepository.deleteById(applicationId);
    }

    // Applications (Customer)
    public Page<AppliedJobResponse> listCustomerApplications(Integer customerId, Pageable pageable) {
        return appliedJobRepository.findByCustomer_CustomerId(customerId, pageable)
                .map(this::toAppliedJobResponse);
    }

    public AppliedJobResponse applyToJob(Integer customerId, Integer jobId) {
        Customer c = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found: " + customerId));
        AvailableJob j = availableJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));
        appliedJobRepository.findByJobAndCustomer(j, c).ifPresent(a -> {
            throw new IllegalStateException("Already applied for this job");
        });
        AppliedJob app = AppliedJob.builder()
                .customer(c)
                .job(j)
                .appliedDate(LocalDateTime.now())
                .status("new")
                .build();
        return toAppliedJobResponse(appliedJobRepository.save(app));
    }

    private JobResponse toJobResponse(AvailableJob j) {
        return JobResponse.builder()
                .jobId(j.getJobId())
                .title(j.getTitle())
                .employmentType(j.getEmploymentType())
                .department(j.getDepartment())
                .location(j.getLocation())
                .jobDescription(j.getJobDescription())
                .postedDate(j.getPostedDate())
                .expiresAt(j.getExpiresAt())
                .active(j.isActive())
                .build();
    }

    private AppliedJobResponse toAppliedJobResponse(AppliedJob a) {
        String name = null;
        String email = null;
        try {
            if (a.getCustomer() != null) {
                String fn = a.getCustomer().getFirstName() == null ? "" : a.getCustomer().getFirstName();
                String ln = a.getCustomer().getLastName() == null ? "" : a.getCustomer().getLastName();
                name = (fn + " " + ln).trim();
                email = a.getCustomer().getEmail();
            }
        } catch (Exception ignored) {}
        return AppliedJobResponse.builder()
                .applicationId(a.getAppliedJobId())
                .jobId(a.getJob() != null ? a.getJob().getJobId() : null)
                .jobTitle(a.getJob() != null ? a.getJob().getTitle() : null)
                .department(a.getJob() != null ? a.getJob().getDepartment() : null)
                .employmentType(a.getJob() != null ? a.getJob().getEmploymentType() : null)
                .customerId(a.getCustomer() != null ? a.getCustomer().getCustomerId() : null)
                .customerName(name)
                .email(email)
                .appliedDate(a.getAppliedDate())
                .status(a.getStatus())
                .build();
    }
}
