package com.laundrypro.service;

import com.laundrypro.model.Orders;
import com.laundrypro.repository.OrdersRepository;
import com.laundrypro.web.staff.dto.StaffDashboardOrderDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@Transactional
public class StaffOrdersService {

    private final OrdersRepository ordersRepository;
    private final NotificationService notificationService;

    public StaffOrdersService(OrdersRepository ordersRepository, NotificationService notificationService) {
        this.ordersRepository = ordersRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<StaffDashboardOrderDto> listAllForDashboard() {
        return ordersRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffDashboardOrderDto getOne(Integer orderId) {
        Orders o = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Order not found: " + orderId));
        return toDto(o);
    }

    public StaffDashboardOrderDto claim(Integer orderId, Integer staffId) {
        Orders o = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Order not found: " + orderId));

        // Assign to staff
        o.setStaffId(staffId);

        // If currently awaiting processing (after pickup), start Washing on claim
        if ("Processing".equalsIgnoreCase(o.getStatus()) || "Pickup Completed".equalsIgnoreCase(o.getStatus())) {
            o.setStatus("Washing");
        }
        // If order is ready for delivery (post-quality check), keep it "Ready for Delivery"
        // so the dispatcher can mark it Delivered in the dispatch queue
        else if ("Ready for Delivery".equalsIgnoreCase(o.getStatus())) {
            // keep status as "Ready for Delivery"
        }
        // Otherwise (pre-pickup claim), it’s pickup scheduling
        else {
            o.setStatus("Pickup Scheduled");
        }

        Orders saved = ordersRepository.save(o);
        // Notify customer about new status
        notificationService.createOrderStatusNotificationForCustomer(saved.getOrderId(), saved.getCustomerId(), saved.getStatus());
        return toDto(saved);
    }





    public StaffDashboardOrderDto updateStatus(Integer orderId, String status) {
        Orders o = ordersRepository.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Order not found: " + orderId));

        // If pickup just completed -> unassign and keep status as "Pickup Completed"
        if ("Pickup Completed".equalsIgnoreCase(status)) {
            o.setStaffId(null);          // make available for processing claim
            o.setStatus("Pickup Completed"); // keep as-is so UI shows it in Pickup Completed container
        }
        // If Quality Check finished -> Ready for Delivery and unassign for dispatch claim
        else if ("Ready for Delivery".equalsIgnoreCase(status)) {
            o.setStaffId(null);          // available to claim for delivery
            o.setStatus("Ready for Delivery");
        }
        // Generic status update
        else {
            o.setStatus(status);
        }

        Orders saved = ordersRepository.save(o);
        // Notify customer
        notificationService.createOrderStatusNotificationForCustomer(saved.getOrderId(), saved.getCustomerId(), saved.getStatus());
        return toDto(saved);
    }


    private StaffDashboardOrderDto toDto(Orders o) {
        return new StaffDashboardOrderDto(
                o.getOrderId(),
                o.getCustomerName(),
                o.getAddress(),
                o.getStatus(),
                o.getStaffId(),
                o.getItems(),
                o.getServiceType(),
                o.getTotal(),
                o.getDate()
        );
    }

    public StaffDashboardOrderDto markDelivered(Integer orderId) {
        return updateStatus(orderId, "Delivered");
    }

}
