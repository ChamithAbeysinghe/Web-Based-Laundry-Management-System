package com.laundrypro.controller;

import com.laundrypro.model.Customer;
import com.laundrypro.model.Staff;
import com.laundrypro.repository.CustomerRepository;
import com.laundrypro.repository.StaffRepository;
import com.laundrypro.DTO.LoginRequest;
import com.laundrypro.DTO.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final CustomerRepository customerRepository;
    private final StaffRepository staffRepository;

    public LoginController(CustomerRepository customerRepository, StaffRepository staffRepository) {
        this.customerRepository = customerRepository;
        this.staffRepository = staffRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req.getEmail() == null || req.getPassword() == null || req.getRole() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing email, password or role");
        }

        switch (req.getRole()) {
            case "customer": {
                Customer c = customerRepository.findByEmail(req.getEmail())
                        .orElse(null);
                if (c == null || !c.getPassword().equals(req.getPassword())) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
                }
                return ResponseEntity.ok(new UserResponse(
                        c.getCustomerId(), c.getEmail(), c.getFirstName(), c.getLastName(), "customer",
                        c.getAddress(), c.getPhone()

                ));
            }
            case "staff":
            case "admin": {
                Staff s = staffRepository.findByEmail(req.getEmail())
                        .orElse(null);
                if (s == null || !s.getPassword().equals(req.getPassword())) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
                }
                // If role requested is admin, ensure stored role is admin
                String effectiveRole = s.getRole() == null ? "staff" : s.getRole().toLowerCase();
                if (req.getRole().equals("admin") && !effectiveRole.equals("admin")) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not authorized as admin");
                }
                // Normalize "staff" vs "admin" for frontend routing
                String frontendRole = effectiveRole.equals("admin") ? "admin" : "staff";
                return ResponseEntity.ok(new UserResponse(
                        s.getStaffId(), s.getEmail(), s.getFirstName(), s.getLastName(), frontendRole
                ));
            }
            default:
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Unsupported role");
        }
    }
}
