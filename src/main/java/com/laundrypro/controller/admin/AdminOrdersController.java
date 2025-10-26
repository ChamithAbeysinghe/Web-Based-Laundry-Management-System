package com.laundrypro.controller.admin;

import com.laundrypro.model.Orders;
import com.laundrypro.service.OrdersService;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Date;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrdersController {

    private final OrdersService orders;

    public AdminOrdersController(OrdersService orders) {
        this.orders = orders;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Orders create(@RequestBody Orders o) {
        return orders.create(o);
    }

    @GetMapping("/{id}")
    public Orders get(@PathVariable Integer id) {
        return orders.get(id);
    }

    @PutMapping("/{id}")
    public Orders update(@PathVariable Integer id, @RequestBody Orders o) {
        return orders.update(id, o);
    }

    @PatchMapping("/{id}/status")
    public Orders updateStatus(@PathVariable Integer id, @RequestParam String status) {
        return orders.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        orders.delete(id);
    }

    @GetMapping
    public Page<Orders> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "date,DESC") String sort,
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Integer staffId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long startDateMillis,
            @RequestParam(required = false) Long endDateMillis
    ) {
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, parts[0]));
        if (customerId != null) return orders.findByCustomer(customerId, pageable);
        if (staffId != null) return orders.findByStaff(staffId, pageable);
        if (status != null && !status.isBlank()) return orders.findByStatus(status, pageable);
        if (startDateMillis != null && endDateMillis != null) {
            return orders.findByDateRange(new Date(startDateMillis), new Date(endDateMillis), pageable);
        }
        return orders.list(pageable);
    }
}
