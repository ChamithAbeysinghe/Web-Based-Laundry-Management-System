package com.laundrypro.service;

import com.laundrypro.model.Orders;
import com.laundrypro.repository.OrdersRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Date;
import java.util.NoSuchElementException;

@Service
@Transactional
public class OrdersService {

    private final OrdersRepository repo;
    private final NotificationService notificationService;

    public OrdersService(OrdersRepository repo, NotificationService notificationService) {
        this.repo = repo;
        this.notificationService = notificationService;
    }

    public Orders create(Orders o) {
        ensureRequired(o);
        ensureTotals(o);
        if (o.getDate() == null) {
            o.setDate(new Date());
        }
        if (o.getStatus() == null || o.getStatus().isBlank()) {
            o.setStatus("Order Placed");
        }

        // Save the order first to get an ID
        Orders savedOrder = repo.save(o);

        // Create a notification for all staff about the new order
        notificationService.createOrderNotification(savedOrder.getOrderId(), o.getCustomerId(), o.getCustomerName());

        return savedOrder;
    }

    @Transactional(readOnly = true)
    public Orders get(Integer id) {
        return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Order not found: " + id));
    }

    public Orders update(Integer id, Orders incoming) {
        Orders existing = get(id);
        // Full update
        existing.setDate(incoming.getDate());
        existing.setCustomerId(incoming.getCustomerId());
        existing.setCustomerName(incoming.getCustomerName());
        existing.setAddress(incoming.getAddress());
        existing.setItems(incoming.getItems());
        existing.setServiceType(incoming.getServiceType());
        existing.setSubTotal(incoming.getSubTotal());
        existing.setTax(incoming.getTax());
        existing.setTotal(incoming.getTotal());
        existing.setPaymentId(incoming.getPaymentId());
        existing.setSpecialInstruction(incoming.getSpecialInstruction());
        existing.setStatus(incoming.getStatus());
        existing.setStaffId(incoming.getStaffId());
        ensureRequired(existing);
        ensureTotals(existing);
        return repo.save(existing);
    }

    public Orders updateStatus(Integer id, String status) {
        Orders existing = get(id);
        existing.setStatus(status);
        return repo.save(existing);
    }

    public void delete(Integer id) {
        if (!repo.existsById(id)) {
            throw new NoSuchElementException("Order not found: " + id);
        }
        repo.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Page<Orders> list(Pageable pageable) {
        return repo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Orders> findByCustomer(Integer customerId, Pageable pageable) {
        return repo.findByCustomerId(customerId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Orders> findByStatus(String status, Pageable pageable) {
        return repo.findByStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Orders> findByStaff(Integer staffId, Pageable pageable) {
        return repo.findByStaffId(staffId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Orders> findByDateRange(Date start, Date end, Pageable pageable) {
        return repo.findByDateBetween(start, end, pageable);
    }

    private void ensureRequired(Orders o) {
        if (o.getCustomerId() == null) throw new IllegalArgumentException("customerId is required");
        if (o.getSubTotal() == null) throw new IllegalArgumentException("subTotal is required");
        if (o.getTax() == null) throw new IllegalArgumentException("tax is required");
        if (o.getStatus() == null || o.getStatus().isBlank()) throw new IllegalArgumentException("status is required");
        if (o.getDate() == null) o.setDate(new Date());
    }

    private void ensureTotals(Orders o) {
        BigDecimal sub = o.getSubTotal() == null ? BigDecimal.ZERO : o.getSubTotal();
        BigDecimal tax = o.getTax() == null ? BigDecimal.ZERO : o.getTax();
        BigDecimal computed = sub.add(tax);
        if (o.getTotal() == null || o.getTotal().compareTo(computed) != 0) {
            o.setTotal(computed);
        }
    }
}
