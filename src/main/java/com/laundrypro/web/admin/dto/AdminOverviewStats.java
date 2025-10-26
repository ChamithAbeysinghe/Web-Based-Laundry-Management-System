package com.laundrypro.web.admin.dto;

import java.math.BigDecimal;
import java.util.List;

public class AdminOverviewStats {
    private long totalCustomers;
    private long totalStaff;
    private long ordersToday;
    private BigDecimal revenueToday;

    // For charts
    private List<String> last7DaysLabels;     // e.g. ["Mon","Tue",...]
    private List<BigDecimal> last7DaysRevenue; // size == labels
    private List<Long> last7DaysOrders;        // size == labels

    public AdminOverviewStats() {}

    public AdminOverviewStats(long totalCustomers, long totalStaff, long ordersToday, BigDecimal revenueToday,
                              List<String> last7DaysLabels, List<BigDecimal> last7DaysRevenue, List<Long> last7DaysOrders) {
        this.totalCustomers = totalCustomers;
        this.totalStaff = totalStaff;
        this.ordersToday = ordersToday;
        this.revenueToday = revenueToday;
        this.last7DaysLabels = last7DaysLabels;
        this.last7DaysRevenue = last7DaysRevenue;
        this.last7DaysOrders = last7DaysOrders;
    }

    public long getTotalCustomers() { return totalCustomers; }
    public void setTotalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; }
    public long getTotalStaff() { return totalStaff; }
    public void setTotalStaff(long totalStaff) { this.totalStaff = totalStaff; }
    public long getOrdersToday() { return ordersToday; }
    public void setOrdersToday(long ordersToday) { this.ordersToday = ordersToday; }
    public BigDecimal getRevenueToday() { return revenueToday; }
    public void setRevenueToday(BigDecimal revenueToday) { this.revenueToday = revenueToday; }
    public List<String> getLast7DaysLabels() { return last7DaysLabels; }
    public void setLast7DaysLabels(List<String> last7DaysLabels) { this.last7DaysLabels = last7DaysLabels; }
    public List<BigDecimal> getLast7DaysRevenue() { return last7DaysRevenue; }
    public void setLast7DaysRevenue(List<BigDecimal> last7DaysRevenue) { this.last7DaysRevenue = last7DaysRevenue; }
    public List<Long> getLast7DaysOrders() { return last7DaysOrders; }
    public void setLast7DaysOrders(List<Long> last7DaysOrders) { this.last7DaysOrders = last7DaysOrders; }
}
