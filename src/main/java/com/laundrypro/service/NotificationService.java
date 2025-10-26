package com.laundrypro.service;

import com.laundrypro.DTO.NotificationDTO;
import com.laundrypro.model.Notification;
import com.laundrypro.model.Staff;
import com.laundrypro.repository.NotificationRepository;
import com.laundrypro.repository.StaffRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final StaffRepository staffRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository, StaffRepository staffRepository) {
        this.notificationRepository = notificationRepository;
        this.staffRepository = staffRepository;
    }

    // Create a new notification (generic)
    public Notification createNotification(String message, String type, Long entityId,
                                          String entityType, Long staffId) {
        Notification notification = new Notification(message, type, entityId, entityType, staffId);
        return notificationRepository.save(notification);
    }

    // Staff queries
    public List<NotificationDTO> getNotificationsForStaff(Long staffId) {
        List<Notification> notifications = notificationRepository.findByStaffIdOrderByCreatedAtDesc(staffId);
        return notifications.stream().map(NotificationDTO::new).collect(Collectors.toList());
    }
    public List<NotificationDTO> getUnreadNotificationsForStaff(Long staffId) {
        List<Notification> notifications = notificationRepository.findByStaffIdAndIsReadFalseOrderByCreatedAtDesc(staffId);
        return notifications.stream().map(NotificationDTO::new).collect(Collectors.toList());
    }
    public long getUnreadNotificationCount(Long staffId) {
        return notificationRepository.countByStaffIdAndIsReadFalse(staffId);
    }

    // Customer queries
    public List<NotificationDTO> getNotificationsForCustomer(Integer customerId) {
        return notificationRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream().map(NotificationDTO::new).collect(Collectors.toList());
    }
    public List<NotificationDTO> getUnreadNotificationsForCustomer(Integer customerId) {
        return notificationRepository.findByCustomerIdAndIsReadFalseOrderByCreatedAtDesc(customerId)
                .stream().map(NotificationDTO::new).collect(Collectors.toList());
    }
    public long getUnreadNotificationCountForCustomer(Integer customerId) {
        return notificationRepository.countByCustomerIdAndIsReadFalse(customerId);
    }

    // Mark as read / delete generic
    public boolean markNotificationAsRead(Long notificationId) {
        Optional<Notification> notificationOpt = notificationRepository.findById(notificationId);
        if (notificationOpt.isPresent()) {
            Notification notification = notificationOpt.get();
            notification.setRead(true);
            notificationRepository.save(notification);
            return true;
        }
        return false;
    }
    public boolean deleteNotification(Long notificationId) {
        if (notificationRepository.existsById(notificationId)) {
            notificationRepository.deleteById(notificationId);
            return true;
        }
        return false;
    }

    // Create notification for a new order to staff
    public void createOrderNotification(Integer orderId, Integer customerId, String customerName) {
        List<Long> staffIds = getAllStaffIds();
        String message = "New order #" + orderId + " placed by customer " + customerName;
        String type = "NEW_ORDER";
        for (Long staffId : staffIds) {
            createNotification(message, type, orderId.longValue(), "ORDER", staffId);
        }
    }

    // Create customer notification for order status update
    public void createOrderStatusNotificationForCustomer(Integer orderId, Integer customerId, String newStatus) {
        if (customerId == null) return;
        Notification n = new Notification();
        n.setMessage("Your order #" + orderId + " status updated to " + newStatus);
        n.setType("ORDER_STATUS");
        n.setEntityId(orderId == null ? null : orderId.longValue());
        n.setEntityType("ORDER");
        n.setStaffId(null);
        n.setCustomerId(customerId);
        notificationRepository.save(n);
    }

    // Helper: fetch staff ids
    private List<Long> getAllStaffIds() {
        List<Staff> all = staffRepository.findAll();
        return all.stream().map(s -> s.getStaffId().longValue()).collect(Collectors.toList());
    }
}
