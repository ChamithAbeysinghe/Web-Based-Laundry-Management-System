package com.laundrypro.service.admin;

import com.laundrypro.model.Customer;
import com.laundrypro.model.Orders;
import com.laundrypro.model.Review;
import com.laundrypro.repository.CustomerRepository;
import com.laundrypro.repository.OrdersRepository;
import com.laundrypro.repository.ReviewRepository;
import com.laundrypro.web.admin.dto.AnalyticsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final OrdersRepository ordersRepository;
    private final CustomerRepository customerRepository;
    private final ReviewRepository reviewRepository;

    public AnalyticsService(OrdersRepository ordersRepository,
                           CustomerRepository customerRepository,
                           ReviewRepository reviewRepository) {
        this.ordersRepository = ordersRepository;
        this.customerRepository = customerRepository;
        this.reviewRepository = reviewRepository;
    }

    public AnalyticsResponse getAnalytics(String timeRange) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = calculateStartDate(endDate, timeRange);

        List<Orders> allOrders = ordersRepository.findAll();
        List<Orders> periodOrders = filterOrdersByDateRange(allOrders, startDate, endDate);

        // Calculate previous period for comparison
        long daysDiff = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        LocalDate prevStartDate = startDate.minusDays(daysDiff);
        LocalDate prevEndDate = startDate.minusDays(1);
        List<Orders> previousPeriodOrders = filterOrdersByDateRange(allOrders, prevStartDate, prevEndDate);

        // Build all analytics components
        AnalyticsResponse.RevenueData revenueData = buildRevenueData(periodOrders, timeRange, startDate, endDate);
        AnalyticsResponse.OrderVolumeData orderVolumeData = buildOrderVolumeData(periodOrders, timeRange, startDate, endDate);
        AnalyticsResponse.ServiceDistribution serviceDistribution = buildServiceDistribution(periodOrders);
        AnalyticsResponse.CustomerRetention customerRetention = buildCustomerRetention(timeRange);
        AnalyticsResponse.SummaryStats summaryStats = buildSummaryStats(periodOrders, previousPeriodOrders);

        return new AnalyticsResponse(revenueData, orderVolumeData, serviceDistribution,
                                    customerRetention, summaryStats);
    }

    private LocalDate calculateStartDate(LocalDate endDate, String timeRange) {
        switch (timeRange) {
            case "week":
                return endDate.minusDays(6); // Last 7 days
            case "quarter":
                return endDate.minusMonths(3);
            case "year":
                return endDate.minusYears(1);
            case "month":
            default:
                return endDate.minusMonths(1);
        }
    }

    private List<Orders> filterOrdersByDateRange(List<Orders> orders, LocalDate startDate, LocalDate endDate) {
        ZoneId zoneId = ZoneId.systemDefault();
        ZonedDateTime start = startDate.atStartOfDay(zoneId);
        ZonedDateTime end = endDate.plusDays(1).atStartOfDay(zoneId);

        return orders.stream()
                .filter(o -> o.getDate() != null)
                .filter(o -> {
                    Instant instant = o.getDate().toInstant();
                    return !instant.isBefore(start.toInstant()) && instant.isBefore(end.toInstant());
                })
                .collect(Collectors.toList());
    }

    private AnalyticsResponse.RevenueData buildRevenueData(List<Orders> orders, String timeRange,
                                                           LocalDate startDate, LocalDate endDate) {
        List<String> labels = new ArrayList<>();
        List<BigDecimal> data = new ArrayList<>();

        if ("week".equals(timeRange)) {
            // Daily for last 7 days
            for (int i = 0; i <= 6; i++) {
                LocalDate date = startDate.plusDays(i);
                labels.add(date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.getDefault()));
                data.add(calculateRevenueForDate(orders, date));
            }
        } else if ("month".equals(timeRange)) {
            // Weekly for last 4 weeks
            LocalDate currentWeekStart = startDate;
            int weekNum = 1;
            while (currentWeekStart.isBefore(endDate) || currentWeekStart.equals(endDate)) {
                labels.add("Week " + weekNum);
                LocalDate weekEnd = currentWeekStart.plusDays(6);
                if (weekEnd.isAfter(endDate)) weekEnd = endDate;
                data.add(calculateRevenueForRange(orders, currentWeekStart, weekEnd));
                currentWeekStart = currentWeekStart.plusDays(7);
                weekNum++;
            }
        } else if ("quarter".equals(timeRange)) {
            // Monthly for last 3 months
            for (int i = 0; i < 3; i++) {
                LocalDate monthStart = endDate.minusMonths(2 - i).withDayOfMonth(1);
                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                if (monthEnd.isAfter(endDate)) monthEnd = endDate;
                labels.add(monthStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.getDefault()));
                data.add(calculateRevenueForRange(orders, monthStart, monthEnd));
            }
        } else if ("year".equals(timeRange)) {
            // Monthly for last 12 months
            for (int i = 11; i >= 0; i--) {
                LocalDate monthStart = endDate.minusMonths(i).withDayOfMonth(1);
                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                if (monthEnd.isAfter(endDate)) monthEnd = endDate;
                labels.add(monthStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.getDefault()));
                data.add(calculateRevenueForRange(orders, monthStart, monthEnd));
            }
        }

        return new AnalyticsResponse.RevenueData(labels, data);
    }

    private AnalyticsResponse.OrderVolumeData buildOrderVolumeData(List<Orders> orders, String timeRange,
                                                                   LocalDate startDate, LocalDate endDate) {
        List<String> labels = new ArrayList<>();
        List<Long> data = new ArrayList<>();

        if ("week".equals(timeRange)) {
            for (int i = 0; i <= 6; i++) {
                LocalDate date = startDate.plusDays(i);
                labels.add(date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.getDefault()));
                data.add(countOrdersForDate(orders, date));
            }
        } else if ("month".equals(timeRange)) {
            LocalDate currentWeekStart = startDate;
            int weekNum = 1;
            while (currentWeekStart.isBefore(endDate) || currentWeekStart.equals(endDate)) {
                labels.add("Week " + weekNum);
                LocalDate weekEnd = currentWeekStart.plusDays(6);
                if (weekEnd.isAfter(endDate)) weekEnd = endDate;
                data.add(countOrdersForRange(orders, currentWeekStart, weekEnd));
                currentWeekStart = currentWeekStart.plusDays(7);
                weekNum++;
            }
        } else if ("quarter".equals(timeRange)) {
            for (int i = 0; i < 3; i++) {
                LocalDate monthStart = endDate.minusMonths(2 - i).withDayOfMonth(1);
                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                if (monthEnd.isAfter(endDate)) monthEnd = endDate;
                labels.add(monthStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.getDefault()));
                data.add(countOrdersForRange(orders, monthStart, monthEnd));
            }
        } else if ("year".equals(timeRange)) {
            for (int i = 11; i >= 0; i--) {
                LocalDate monthStart = endDate.minusMonths(i).withDayOfMonth(1);
                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                if (monthEnd.isAfter(endDate)) monthEnd = endDate;
                labels.add(monthStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.getDefault()));
                data.add(countOrdersForRange(orders, monthStart, monthEnd));
            }
        }

        return new AnalyticsResponse.OrderVolumeData(labels, data);
    }

    private AnalyticsResponse.ServiceDistribution buildServiceDistribution(List<Orders> orders) {
        Map<String, Long> serviceCounts = orders.stream()
                .filter(o -> o.getServiceType() != null && !o.getServiceType().trim().isEmpty())
                .collect(Collectors.groupingBy(
                    o -> o.getServiceType().trim(),
                    Collectors.counting()
                ));

        Map<String, BigDecimal> serviceRevenue = orders.stream()
                .filter(o -> o.getServiceType() != null && !o.getServiceType().trim().isEmpty())
                .collect(Collectors.groupingBy(
                    o -> o.getServiceType().trim(),
                    Collectors.reducing(
                        BigDecimal.ZERO,
                        o -> o.getTotal() != null ? o.getTotal() : BigDecimal.ZERO,
                        BigDecimal::add
                    )
                ));

        List<String> labels = new ArrayList<>(serviceCounts.keySet());
        List<Long> data = labels.stream()
                .map(serviceCounts::get)
                .collect(Collectors.toList());

        return new AnalyticsResponse.ServiceDistribution(labels, data, serviceRevenue);
    }

    private AnalyticsResponse.CustomerRetention buildCustomerRetention(String timeRange) {
        List<Orders> allOrders = ordersRepository.findAll();

        List<String> labels = new ArrayList<>();
        List<Long> newCustomers = new ArrayList<>();
        List<Long> returningCustomers = new ArrayList<>();

        LocalDate endDate = LocalDate.now();
        int periods = timeRange.equals("year") ? 12 : 6;

        // Build a map of customer ID to their first order date
        Map<Integer, LocalDate> customerFirstOrderMap = new HashMap<>();
        for (Orders order : allOrders) {
            if (order.getCustomerId() != null && order.getDate() != null) {
                LocalDate orderDate = order.getDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                customerFirstOrderMap.merge(order.getCustomerId(), orderDate,
                    (existing, newDate) -> existing.isBefore(newDate) ? existing : newDate);
            }
        }

        for (int i = periods - 1; i >= 0; i--) {
            LocalDate monthStart = endDate.minusMonths(i).withDayOfMonth(1);
            LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
            if (monthEnd.isAfter(endDate)) monthEnd = endDate;

            final LocalDate finalMonthStart = monthStart;
            final LocalDate finalMonthEnd = monthEnd;

            labels.add(monthStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.getDefault()));

            // Count new customers (first order in this month)
            long newCust = customerFirstOrderMap.entrySet().stream()
                    .filter(entry -> {
                        LocalDate firstOrder = entry.getValue();
                        return !firstOrder.isBefore(finalMonthStart) && !firstOrder.isAfter(finalMonthEnd);
                    })
                    .count();

            // Count returning customers (had orders in this month but first order was earlier)
            Set<Integer> customersWithOrdersThisMonth = allOrders.stream()
                    .filter(o -> o.getCustomerId() != null && o.getDate() != null)
                    .filter(o -> {
                        LocalDate orderDate = o.getDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                        return !orderDate.isBefore(finalMonthStart) && !orderDate.isAfter(finalMonthEnd);
                    })
                    .map(Orders::getCustomerId)
                    .collect(Collectors.toSet());

            long returning = customersWithOrdersThisMonth.stream()
                    .filter(custId -> {
                        LocalDate firstOrder = customerFirstOrderMap.get(custId);
                        return firstOrder != null && firstOrder.isBefore(finalMonthStart);
                    })
                    .count();

            newCustomers.add(newCust);
            returningCustomers.add(returning);
        }

        return new AnalyticsResponse.CustomerRetention(labels, newCustomers, returningCustomers);
    }

    private AnalyticsResponse.SummaryStats buildSummaryStats(List<Orders> currentPeriod,
                                                             List<Orders> previousPeriod) {
        // Calculate current period stats
        BigDecimal totalRevenue = currentPeriod.stream()
                .map(o -> o.getTotal() != null ? o.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long ordersProcessed = currentPeriod.size();

        // Calculate previous period stats for comparison
        BigDecimal prevRevenue = previousPeriod.stream()
                .map(o -> o.getTotal() != null ? o.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long prevOrders = previousPeriod.size();

        // Calculate percentage changes
        double revenueChange = calculatePercentageChange(prevRevenue, totalRevenue);
        double ordersChange = calculatePercentageChange(prevOrders, ordersProcessed);

        // Calculate new customers in current period (based on first order)
        List<Orders> allOrders = ordersRepository.findAll();
        Map<Integer, LocalDate> customerFirstOrderMap = new HashMap<>();
        for (Orders order : allOrders) {
            if (order.getCustomerId() != null && order.getDate() != null) {
                LocalDate orderDate = order.getDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                customerFirstOrderMap.merge(order.getCustomerId(), orderDate,
                    (existing, newDate) -> existing.isBefore(newDate) ? existing : newDate);
            }
        }

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(1);
        LocalDate prevStartDate = startDate.minusMonths(1);

        long newCustomers = customerFirstOrderMap.entrySet().stream()
                .filter(entry -> {
                    LocalDate firstOrder = entry.getValue();
                    return !firstOrder.isBefore(startDate) && !firstOrder.isAfter(endDate);
                })
                .count();

        long prevNewCustomers = customerFirstOrderMap.entrySet().stream()
                .filter(entry -> {
                    LocalDate firstOrder = entry.getValue();
                    return !firstOrder.isBefore(prevStartDate) && firstOrder.isBefore(startDate);
                })
                .count();

        double customersChange = calculatePercentageChange(prevNewCustomers, newCustomers);

        // Calculate average rating
        List<Review> allReviews = reviewRepository.findAll();
        double averageRating = allReviews.stream()
                .filter(r -> r.getRating() != null)
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        // For rating change, compare last 30 days vs previous 30 days
        LocalDate ratingEndDate = LocalDate.now();
        LocalDate ratingStartDate = ratingEndDate.minusDays(30);
        LocalDate ratingPrevStart = ratingStartDate.minusDays(30);

        double currentAvgRating = allReviews.stream()
                .filter(r -> r.getRating() != null && r.getCreatedAt() != null)
                .filter(r -> {
                    LocalDate reviewDate = r.getCreatedAt().toLocalDate();
                    return !reviewDate.isBefore(ratingStartDate) && !reviewDate.isAfter(ratingEndDate);
                })
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        double prevAvgRating = allReviews.stream()
                .filter(r -> r.getRating() != null && r.getCreatedAt() != null)
                .filter(r -> {
                    LocalDate reviewDate = r.getCreatedAt().toLocalDate();
                    return !reviewDate.isBefore(ratingPrevStart) && reviewDate.isBefore(ratingStartDate);
                })
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);

        double ratingChange = currentAvgRating - prevAvgRating;

        return new AnalyticsResponse.SummaryStats(
            totalRevenue, revenueChange, ordersProcessed, ordersChange,
            newCustomers, customersChange, averageRating, ratingChange
        );
    }

    private double calculatePercentageChange(BigDecimal oldValue, BigDecimal newValue) {
        if (oldValue.compareTo(BigDecimal.ZERO) == 0) {
            return newValue.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        return newValue.subtract(oldValue)
                .divide(oldValue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
    }

    private double calculatePercentageChange(long oldValue, long newValue) {
        if (oldValue == 0) {
            return newValue > 0 ? 100.0 : 0.0;
        }
        return ((double) (newValue - oldValue) / oldValue) * 100.0;
    }

    private BigDecimal calculateRevenueForDate(List<Orders> orders, LocalDate date) {
        return orders.stream()
                .filter(o -> {
                    LocalDate orderDate = o.getDate().toInstant()
                            .atZone(ZoneId.systemDefault()).toLocalDate();
                    return orderDate.equals(date);
                })
                .map(o -> o.getTotal() != null ? o.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateRevenueForRange(List<Orders> orders, LocalDate start, LocalDate end) {
        return orders.stream()
                .filter(o -> {
                    LocalDate orderDate = o.getDate().toInstant()
                            .atZone(ZoneId.systemDefault()).toLocalDate();
                    return !orderDate.isBefore(start) && !orderDate.isAfter(end);
                })
                .map(o -> o.getTotal() != null ? o.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long countOrdersForDate(List<Orders> orders, LocalDate date) {
        return orders.stream()
                .filter(o -> {
                    LocalDate orderDate = o.getDate().toInstant()
                            .atZone(ZoneId.systemDefault()).toLocalDate();
                    return orderDate.equals(date);
                })
                .count();
    }

    private long countOrdersForRange(List<Orders> orders, LocalDate start, LocalDate end) {
        return orders.stream()
                .filter(o -> {
                    LocalDate orderDate = o.getDate().toInstant()
                            .atZone(ZoneId.systemDefault()).toLocalDate();
                    return !orderDate.isBefore(start) && !orderDate.isAfter(end);
                })
                .count();
    }
}

