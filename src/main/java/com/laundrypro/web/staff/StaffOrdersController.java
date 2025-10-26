package com.laundrypro.web.staff;

import com.laundrypro.service.StaffOrdersService;
import com.laundrypro.web.staff.dto.StaffDashboardOrderDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff/orders")
public class StaffOrdersController {

    private final StaffOrdersService staffOrdersService;

    public StaffOrdersController(StaffOrdersService staffOrdersService) {
        this.staffOrdersService = staffOrdersService;
    }

    // GET /api/staff/orders
    @GetMapping
    public List<StaffDashboardOrderDto> listAll() {
        return staffOrdersService.listAllForDashboard();
    }

    // GET /api/staff/orders/{orderId}
    @GetMapping("/{orderId}")
    public StaffDashboardOrderDto getOne(@PathVariable Integer orderId) {
        return staffOrdersService.getOne(orderId);
    }

    // PUT /api/staff/orders/{orderId}/claim?staffId=#
    @PutMapping("/{orderId}/claim")
    public ResponseEntity<StaffDashboardOrderDto> claim(@PathVariable Integer orderId, @RequestParam Integer staffId) {
        if (staffId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        return ResponseEntity.ok(staffOrdersService.claim(orderId, staffId));
    }

    // PUT /api/staff/orders/{orderId}/status?status=Next
    @PutMapping("/{orderId}/status")
    public ResponseEntity<StaffDashboardOrderDto> updateStatus(@PathVariable Integer orderId, @RequestParam String status) {
        if (status == null || status.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        return ResponseEntity.ok(staffOrdersService.updateStatus(orderId, status));
    }

    // PUT /api/staff/orders/{orderId}/delivered
    @PutMapping("/{orderId}/delivered")
    public StaffDashboardOrderDto markDelivered(@PathVariable Integer orderId) {
        return staffOrdersService.markDelivered(orderId);
    }
}
