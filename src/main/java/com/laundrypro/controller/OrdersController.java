package com.laundrypro.controller;

import com.laundrypro.model.Orders;
import com.laundrypro.service.OrdersService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Date;

@RestController
@RequestMapping("/api/orders")
public class OrdersController {

    private final OrdersService service;

    public OrdersController(OrdersService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Orders create(@RequestBody Orders order) {
        return service.create(order);
    }

    @GetMapping("/{id}")
    public Orders get(@PathVariable Integer id) {
        return service.get(id);
    }

    @PutMapping("/{id}")
    public Orders update(@PathVariable Integer id, @RequestBody Orders order) {
        return service.update(id, order);
    }

    @PatchMapping("/{id}/status")
    public Orders updateStatus(@PathVariable Integer id, @RequestParam String status) {
        return service.updateStatus(id, status);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        service.delete(id);
    }

    @GetMapping
    public Page<Orders> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "date,DESC") String sort,        // e.g., "date,DESC" or "orderId,ASC"
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Integer staffId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long startDateMillis,
            @RequestParam(required = false) Long endDateMillis
    ) {
        String[] sortParts = sort.split(",", 2);
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParts[0]));

        if (customerId != null) return service.findByCustomer(customerId, pageable);
        if (staffId != null) return service.findByStaff(staffId, pageable);
        if (status != null) return service.findByStatus(status, pageable);
        if (startDateMillis != null && endDateMillis != null) {
            return service.findByDateRange(new Date(startDateMillis), new Date(endDateMillis), pageable);
        }
        return service.list(pageable);
    }
}
