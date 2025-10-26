package com.laundrypro.web.admin.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class AnalyticsResponse {
    private RevenueData revenueData;
    private OrderVolumeData orderVolumeData;
    private ServiceDistribution serviceDistribution;
    private CustomerRetention customerRetention;
    private SummaryStats summaryStats;

    public static class RevenueData {
        private List<String> labels;
        private List<BigDecimal> data;

        public RevenueData() {}

        public RevenueData(List<String> labels, List<BigDecimal> data) {
            this.labels = labels;
            this.data = data;
        }

        public List<String> getLabels() { return labels; }
        public void setLabels(List<String> labels) { this.labels = labels; }
        public List<BigDecimal> getData() { return data; }
        public void setData(List<BigDecimal> data) { this.data = data; }
    }

    public static class OrderVolumeData {
        private List<String> labels;
        private List<Long> data;

        public OrderVolumeData() {}

        public OrderVolumeData(List<String> labels, List<Long> data) {
            this.labels = labels;
            this.data = data;
        }

        public List<String> getLabels() { return labels; }
        public void setLabels(List<String> labels) { this.labels = labels; }
        public List<Long> getData() { return data; }
        public void setData(List<Long> data) { this.data = data; }
    }

    public static class ServiceDistribution {
        private List<String> labels;
        private List<Long> data;
        private Map<String, BigDecimal> revenueByService;

        public ServiceDistribution() {}

        public ServiceDistribution(List<String> labels, List<Long> data, Map<String, BigDecimal> revenueByService) {
            this.labels = labels;
            this.data = data;
            this.revenueByService = revenueByService;
        }

        public List<String> getLabels() { return labels; }
        public void setLabels(List<String> labels) { this.labels = labels; }
        public List<Long> getData() { return data; }
        public void setData(List<Long> data) { this.data = data; }
        public Map<String, BigDecimal> getRevenueByService() { return revenueByService; }
        public void setRevenueByService(Map<String, BigDecimal> revenueByService) { this.revenueByService = revenueByService; }
    }

    public static class CustomerRetention {
        private List<String> labels;
        private List<Long> newCustomers;
        private List<Long> returningCustomers;

        public CustomerRetention() {}

        public CustomerRetention(List<String> labels, List<Long> newCustomers, List<Long> returningCustomers) {
            this.labels = labels;
            this.newCustomers = newCustomers;
            this.returningCustomers = returningCustomers;
        }

        public List<String> getLabels() { return labels; }
        public void setLabels(List<String> labels) { this.labels = labels; }
        public List<Long> getNewCustomers() { return newCustomers; }
        public void setNewCustomers(List<Long> newCustomers) { this.newCustomers = newCustomers; }
        public List<Long> getReturningCustomers() { return returningCustomers; }
        public void setReturningCustomers(List<Long> returningCustomers) { this.returningCustomers = returningCustomers; }
    }

    public static class SummaryStats {
        private BigDecimal totalRevenue;
        private double revenueChange;
        private long ordersProcessed;
        private double ordersChange;
        private long newCustomers;
        private double customersChange;
        private double averageRating;
        private double ratingChange;

        public SummaryStats() {}

        public SummaryStats(BigDecimal totalRevenue, double revenueChange, long ordersProcessed,
                          double ordersChange, long newCustomers, double customersChange,
                          double averageRating, double ratingChange) {
            this.totalRevenue = totalRevenue;
            this.revenueChange = revenueChange;
            this.ordersProcessed = ordersProcessed;
            this.ordersChange = ordersChange;
            this.newCustomers = newCustomers;
            this.customersChange = customersChange;
            this.averageRating = averageRating;
            this.ratingChange = ratingChange;
        }

        public BigDecimal getTotalRevenue() { return totalRevenue; }
        public void setTotalRevenue(BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
        public double getRevenueChange() { return revenueChange; }
        public void setRevenueChange(double revenueChange) { this.revenueChange = revenueChange; }
        public long getOrdersProcessed() { return ordersProcessed; }
        public void setOrdersProcessed(long ordersProcessed) { this.ordersProcessed = ordersProcessed; }
        public double getOrdersChange() { return ordersChange; }
        public void setOrdersChange(double ordersChange) { this.ordersChange = ordersChange; }
        public long getNewCustomers() { return newCustomers; }
        public void setNewCustomers(long newCustomers) { this.newCustomers = newCustomers; }
        public double getCustomersChange() { return customersChange; }
        public void setCustomersChange(double customersChange) { this.customersChange = customersChange; }
        public double getAverageRating() { return averageRating; }
        public void setAverageRating(double averageRating) { this.averageRating = averageRating; }
        public double getRatingChange() { return ratingChange; }
        public void setRatingChange(double ratingChange) { this.ratingChange = ratingChange; }
    }

    public AnalyticsResponse() {}

    public AnalyticsResponse(RevenueData revenueData, OrderVolumeData orderVolumeData,
                           ServiceDistribution serviceDistribution, CustomerRetention customerRetention,
                           SummaryStats summaryStats) {
        this.revenueData = revenueData;
        this.orderVolumeData = orderVolumeData;
        this.serviceDistribution = serviceDistribution;
        this.customerRetention = customerRetention;
        this.summaryStats = summaryStats;
    }

    public RevenueData getRevenueData() { return revenueData; }
    public void setRevenueData(RevenueData revenueData) { this.revenueData = revenueData; }
    public OrderVolumeData getOrderVolumeData() { return orderVolumeData; }
    public void setOrderVolumeData(OrderVolumeData orderVolumeData) { this.orderVolumeData = orderVolumeData; }
    public ServiceDistribution getServiceDistribution() { return serviceDistribution; }
    public void setServiceDistribution(ServiceDistribution serviceDistribution) { this.serviceDistribution = serviceDistribution; }
    public CustomerRetention getCustomerRetention() { return customerRetention; }
    public void setCustomerRetention(CustomerRetention customerRetention) { this.customerRetention = customerRetention; }
    public SummaryStats getSummaryStats() { return summaryStats; }
    public void setSummaryStats(SummaryStats summaryStats) { this.summaryStats = summaryStats; }
}

