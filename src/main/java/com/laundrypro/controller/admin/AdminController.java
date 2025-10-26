package com.laundrypro.controller.admin;

import com.laundrypro.service.StaffService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final StaffService staffService;

    @Autowired
    public AdminController(StaffService staffService) {
        this.staffService = staffService;
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changeAdminPassword(@RequestBody Map<String, String> payload) {
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");
        boolean success = staffService.changeAdminPassword(currentPassword, newPassword);
        if (success) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Current password is incorrect or admin account not found.");
        }
    }
}

