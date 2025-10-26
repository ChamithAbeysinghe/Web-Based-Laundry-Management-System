package com.laundrypro.jobs.domain;

import com.laundrypro.model.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "Applied_Jobs",
       uniqueConstraints = @UniqueConstraint(name = "UQ_Applied_Jobs", columnNames = {"JobID", "Customer_ID"}))
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppliedJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "applied_jobid")
    private Integer appliedJobId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "JobID", nullable = false,
            foreignKey = @ForeignKey(name = "FK_Applied_Jobs_Job"))
    private AvailableJob job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "Customer_ID", nullable = false,
            foreignKey = @ForeignKey(name = "FK_Applied_Jobs_Customer"))
    private Customer customer;

    @Column(name = "Applied_Date", nullable = false)
    private LocalDateTime appliedDate;

    // Ensure this column exists in DB as noted above
    @Column(name = "Status", nullable = false, length = 20)
    private String status; // new | reviewed | accepted | rejected

    @PrePersist
    public void prePersist() {
        if (appliedDate == null) appliedDate = LocalDateTime.now();
        if (status == null) status = "new";
    }
}
