package com.laundrypro.jobs.repo;

import com.laundrypro.jobs.domain.AvailableJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailableJobRepository extends JpaRepository<AvailableJob, Integer> {
    Page<AvailableJob> findByActive(boolean active, Pageable pageable);
    Page<AvailableJob> findByEmploymentTypeIgnoreCase(String employmentType, Pageable pageable);
}
