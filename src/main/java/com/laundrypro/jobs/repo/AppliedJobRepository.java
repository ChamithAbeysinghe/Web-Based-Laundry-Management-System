package com.laundrypro.jobs.repo;

import com.laundrypro.jobs.domain.AppliedJob;
import com.laundrypro.jobs.domain.AvailableJob;
import com.laundrypro.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppliedJobRepository extends JpaRepository<AppliedJob, Integer> {
    Page<AppliedJob> findByCustomer_CustomerId(Integer customerId, Pageable pageable);
    Optional<AppliedJob> findByJobAndCustomer(AvailableJob job, Customer customer);
    List<AppliedJob> findByJob(AvailableJob job);
}
