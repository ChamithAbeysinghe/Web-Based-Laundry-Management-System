package com.laundrypro.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Report")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Report_ID")
    private Integer reportId;

    @Column(name = "Completed_Order_Count")
    private Long completedOrderCount;

    @Column(name = "Total_Customers")
    private Long totalCustomers;

    @Column(name = "Total_Income", precision = 10, scale = 2)
    private BigDecimal totalIncome;

    @Column(name = "Report_Date")
    private LocalDateTime reportDate;

    @Column(name = "Time_Range", length = 50)
    private String timeRange;

    @Column(name = "Generated_By", length = 100)
    private String generatedBy;

    public Report() {
        this.reportDate = LocalDateTime.now();
    }

    public Report(Long completedOrderCount, Long totalCustomers, BigDecimal totalIncome,
                  String timeRange, String generatedBy) {
        this.completedOrderCount = completedOrderCount;
        this.totalCustomers = totalCustomers;
        this.totalIncome = totalIncome;
        this.timeRange = timeRange;
        this.generatedBy = generatedBy;
        this.reportDate = LocalDateTime.now();
    }

    // Getters and Setters
    public Integer getReportId() {
        return reportId;
    }

    public void setReportId(Integer reportId) {
        this.reportId = reportId;
    }

    public Long getCompletedOrderCount() {
        return completedOrderCount;
    }

    public void setCompletedOrderCount(Long completedOrderCount) {
        this.completedOrderCount = completedOrderCount;
    }

    public Long getTotalCustomers() {
        return totalCustomers;
    }

    public void setTotalCustomers(Long totalCustomers) {
        this.totalCustomers = totalCustomers;
    }

    public BigDecimal getTotalIncome() {
        return totalIncome;
    }

    public void setTotalIncome(BigDecimal totalIncome) {
        this.totalIncome = totalIncome;
    }

    public LocalDateTime getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDateTime reportDate) {
        this.reportDate = reportDate;
    }

    public String getTimeRange() {
        return timeRange;
    }

    public void setTimeRange(String timeRange) {
        this.timeRange = timeRange;
    }

    public String getGeneratedBy() {
        return generatedBy;
    }

    public void setGeneratedBy(String generatedBy) {
        this.generatedBy = generatedBy;
    }
}

