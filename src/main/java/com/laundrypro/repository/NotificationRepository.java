package com.laundrypro.repository;

import com.laundrypro.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Find notifications for a specific staff member
    List<Notification> findByStaffIdOrderByCreatedAtDesc(Long staffId);

    // Find unread notifications for a staff member
    List<Notification> findByStaffIdAndIsReadFalseOrderByCreatedAtDesc(Long staffId);

    // Count unread notifications for a staff member
    long countByStaffIdAndIsReadFalse(Long staffId);

    // Customer-specific
    List<Notification> findByCustomerIdOrderByCreatedAtDesc(Integer customerId);

    // Find unread notifications for a customer
    List<Notification> findByCustomerIdAndIsReadFalseOrderByCreatedAtDesc(Integer customerId);

    // Count unread notifications for a customer
    long countByCustomerIdAndIsReadFalse(Integer customerId);
}
