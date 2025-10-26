package com.laundrypro.service.admin;

import com.laundrypro.model.Orders;
import com.laundrypro.repository.CustomerRepository;
import com.laundrypro.repository.OrdersRepository;
import com.laundrypro.repository.StaffRepository;
import com.laundrypro.web.admin.dto.AdminOverviewStats;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AdminDashboardService {

    private final OrdersRepository ordersRepository;
    private final CustomerRepository customerRepository;
    private final StaffRepository staffRepository;

    public AdminDashboardService(OrdersRepository ordersRepository,
                                 CustomerRepository customerRepository,
                                 StaffRepository staffRepository) {
        this.ordersRepository = ordersRepository;
        this.customerRepository = customerRepository;
        this.staffRepository = staffRepository;
    }

    public AdminOverviewStats overview() {
        // Use simple count queries - much faster than loading all entities
        long totalCustomers = customerRepository.count();
        long totalStaff = staffRepository.count();

        // Today range
        ZonedDateTime now = ZonedDateTime.now();
        ZonedDateTime startOfToday = now.toLocalDate().atStartOfDay(now.getZone());
        ZonedDateTime endOfToday = startOfToday.plusDays(1).minusNanos(1);

        Date todayStart = Date.from(startOfToday.toInstant());
        Date todayEnd = Date.from(endOfToday.toInstant());

        // Use optimized database queries instead of loading all orders
        long ordersToday = ordersRepository.countOrdersBetween(todayStart, todayEnd);
        BigDecimal revenueToday = ordersRepository.sumRevenueBetween(todayStart, todayEnd);

        // Last 7 days - only load orders from last 7 days, not all orders
        LocalDate sevenDaysAgo = LocalDate.now().minusDays(6);
        ZonedDateTime sevenDaysStart = sevenDaysAgo.atStartOfDay(now.getZone());
        Date startDate = Date.from(sevenDaysStart.toInstant());
        Date endDate = Date.from(endOfToday.toInstant());

        // Only fetch orders from last 7 days
        List<Orders> recentOrders = ordersRepository.findByDateBetween(startDate, endDate);

        // Build labels and data
        List<LocalDate> last7Days = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            last7Days.add(LocalDate.now().minusDays(i));
        }
        List<String> labels = last7Days.stream()
                .map(d -> d.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.getDefault()))
                .collect(Collectors.toList());

        List<BigDecimal> revenue = new ArrayList<>();
        List<Long> orders = new ArrayList<>();

        // Process only the recent orders (already filtered by database)
        for (LocalDate d : last7Days) {
            ZonedDateTime start = d.atStartOfDay(now.getZone());
            ZonedDateTime end = start.plusDays(1).minusNanos(1);

            BigDecimal dayRevenue = recentOrders.stream()
                    .filter(o -> inRange(o.getDate(), start, end))
                    .map(o -> o.getTotal() == null ? BigDecimal.ZERO : o.getTotal())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long dayOrders = recentOrders.stream()
                    .filter(o -> inRange(o.getDate(), start, end))
                    .count();

            revenue.add(dayRevenue);
            orders.add(dayOrders);
        }

        return new AdminOverviewStats(
                totalCustomers,
                totalStaff,
                ordersToday,
                revenueToday,
                labels,
                revenue,
                orders
        );
    }

    private boolean inRange(Date date, ZonedDateTime start, ZonedDateTime end) {
        if (date == null) return false;
        Instant instant = date.toInstant();
        return !instant.isBefore(start.toInstant()) && !instant.isAfter(end.toInstant());
        // inclusive range
    }
}
