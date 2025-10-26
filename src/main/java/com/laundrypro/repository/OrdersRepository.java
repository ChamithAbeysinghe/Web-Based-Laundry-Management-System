package com.laundrypro.repository;

import com.laundrypro.model.Orders;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;


public interface OrdersRepository extends JpaRepository<Orders, Integer> {
    Page<Orders> findByCustomerId(Integer customerId, Pageable pageable);
    Page<Orders> findByStaffId(Integer staffId, Pageable pageable);
    Page<Orders> findByStatus(String status, Pageable pageable);
    Page<Orders> findByDateBetween(Date start, Date end, Pageable pageable);
    List<Orders> findAllByCustomerId(Integer customerId);

    // Optimized queries for dashboard statistics
    @Query("SELECT COUNT(o) FROM Orders o WHERE o.date >= :startDate AND o.date <= :endDate")
    long countOrdersBetween(@Param("startDate") Date startDate, @Param("endDate") Date endDate);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Orders o WHERE o.date >= :startDate AND o.date <= :endDate")
    BigDecimal sumRevenueBetween(@Param("startDate") Date startDate, @Param("endDate") Date endDate);

    List<Orders> findByDateBetween(Date start, Date end);
}
