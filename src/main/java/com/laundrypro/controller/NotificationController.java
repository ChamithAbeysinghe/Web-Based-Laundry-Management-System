package com.laundrypro.controller;

import com.laundrypro.DTO.NotificationDTO;
import com.laundrypro.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @Autowired
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // Staff
    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<NotificationDTO>> getNotificationsForStaff(@PathVariable Long staffId) {
        return ResponseEntity.ok(notificationService.getNotificationsForStaff(staffId));
    }

    @GetMapping("/staff/{staffId}/unread")
    public ResponseEntity<List<NotificationDTO>> getUnreadNotificationsForStaff(@PathVariable Long staffId) {
        return ResponseEntity.ok(notificationService.getUnreadNotificationsForStaff(staffId));
    }

    @GetMapping("/staff/{staffId}/count")
    public ResponseEntity<Map<String, Long>> getUnreadNotificationCount(@PathVariable Long staffId) {
        long count = notificationService.getUnreadNotificationCount(staffId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    // Customer
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<NotificationDTO>> getNotificationsForCustomer(@PathVariable Integer customerId) {
        return ResponseEntity.ok(notificationService.getNotificationsForCustomer(customerId));
    }

    @GetMapping("/customer/{customerId}/unread")
    public ResponseEntity<List<NotificationDTO>> getUnreadNotificationsForCustomer(@PathVariable Integer customerId) {
        return ResponseEntity.ok(notificationService.getUnreadNotificationsForCustomer(customerId));
    }

    @GetMapping("/customer/{customerId}/count")
    public ResponseEntity<Map<String, Long>> getUnreadNotificationCountForCustomer(@PathVariable Integer customerId) {
        long count = notificationService.getUnreadNotificationCountForCustomer(customerId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId) {
        return notificationService.markNotificationAsRead(notificationId) ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long notificationId) {
        return notificationService.deleteNotification(notificationId) ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }
}
