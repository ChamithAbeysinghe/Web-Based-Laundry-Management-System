package com.laundrypro.controller.admin;

import com.laundrypro.service.admin.AdminDashboardService;
import com.laundrypro.service.admin.AnalyticsService;
import com.laundrypro.web.admin.dto.AdminOverviewStats;
import com.laundrypro.web.admin.dto.AnalyticsResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/stats")
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;
    private final AnalyticsService analyticsService;

    public AdminDashboardController(AdminDashboardService dashboardService, AnalyticsService analyticsService) {
        this.dashboardService = dashboardService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public AdminOverviewStats overview() {
        return dashboardService.overview();
    }

    @GetMapping("/analytics")
    public AnalyticsResponse analytics(@RequestParam(defaultValue = "month") String timeRange) {
        return analyticsService.getAnalytics(timeRange);
    }
}
