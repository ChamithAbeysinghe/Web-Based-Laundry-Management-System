package com.laundrypro.service.admin;

import com.laundrypro.model.Report;
import com.laundrypro.repository.CustomerRepository;
import com.laundrypro.repository.OrdersRepository;
import com.laundrypro.repository.ReportRepository;
import com.laundrypro.web.admin.dto.AnalyticsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

@Service
@Transactional
public class ReportService {

    private final ReportRepository reportRepository;
    private final OrdersRepository ordersRepository;
    private final CustomerRepository customerRepository;
    private final AnalyticsService analyticsService;

    public ReportService(ReportRepository reportRepository,
                        OrdersRepository ordersRepository,
                        CustomerRepository customerRepository,
                        AnalyticsService analyticsService) {
        this.reportRepository = reportRepository;
        this.ordersRepository = ordersRepository;
        this.customerRepository = customerRepository;
        this.analyticsService = analyticsService;
    }

    public Report saveReport(String timeRange, String generatedBy) {
        // Get analytics data for the time range
        AnalyticsResponse analytics = analyticsService.getAnalytics(timeRange);

        // Calculate date range
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = calculateStartDate(endDate, timeRange);

        // Get total customers
        long totalCustomers = customerRepository.count();

        // Get completed orders and total income
        Date startDateObj = Date.from(startDate.atStartOfDay(ZoneId.systemDefault()).toInstant());
        Date endDateObj = Date.from(endDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant());

        long completedOrderCount = ordersRepository.findByDateBetween(startDateObj, endDateObj).stream()
                .filter(o -> o.getStatus() != null &&
                       (o.getStatus().toLowerCase().contains("complete") ||
                        o.getStatus().toLowerCase().contains("delivered")))
                .count();

        BigDecimal totalIncome = analytics.getSummaryStats().getTotalRevenue();

        // Create and save report
        Report report = new Report(completedOrderCount, totalCustomers, totalIncome, timeRange, generatedBy);

        return reportRepository.save(report);
    }

    @Transactional(readOnly = true)
    public List<Report> getAllReports() {
        Pageable pageable = PageRequest.of(0, 100);
        Page<Report> page = reportRepository.findAllByOrderByReportDateDesc(pageable);
        return page.getContent();
    }

    @Transactional(readOnly = true)
    public Report getReportById(Integer id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found with id: " + id));
    }

    public void deleteReport(Integer id) {
        reportRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<Report> getReportsByTimeRange(String timeRange) {
        return reportRepository.findByTimeRange(timeRange);
    }

    private LocalDate calculateStartDate(LocalDate endDate, String timeRange) {
        switch (timeRange) {
            case "week":
                return endDate.minusDays(6);
            case "quarter":
                return endDate.minusMonths(3);
            case "year":
                return endDate.minusYears(1);
            case "month":
            default:
                return endDate.minusMonths(1);
        }
    }
}

