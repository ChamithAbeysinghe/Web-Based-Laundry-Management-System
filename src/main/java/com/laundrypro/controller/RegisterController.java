package com.laundrypro.controller;

import com.laundrypro.model.Customer;
import com.laundrypro.model.Staff;
import com.laundrypro.repository.CustomerRepository;
import com.laundrypro.repository.StaffRepository;
import com.laundrypro.DTO.RegisterRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class RegisterController {

    private final CustomerRepository customerRepository;
    private final StaffRepository staffRepository;

    public RegisterController(CustomerRepository customerRepository, StaffRepository staffRepository) {
        this.customerRepository = customerRepository;
        this.staffRepository = staffRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody RegisterRequest req) {
        if (req.getEmail() == null || req.getPassword() == null || req.getRole() == null
                || req.getFirstName() == null || req.getLastName() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing required fields");
        }

        switch (req.getRole()) {
            case "customer": {
                if (customerRepository.existsByEmail(req.getEmail())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email already in use");
                }
                Customer c = new Customer();
                c.setFirstName(req.getFirstName());
                c.setLastName(req.getLastName());
                c.setEmail(req.getEmail());
                c.setPassword(req.getPassword());
                c.setPhone(req.getPhone());
                c.setAddress(req.getAddress());
                c.setRole("customer");
                customerRepository.save(c);
                return ResponseEntity.ok("Registration successful");
            }
            case "staff": {
                if (staffRepository.existsByEmail(req.getEmail())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email already in use");
                }
                Staff s = new Staff();
                s.setFirstName(req.getFirstName());
                s.setLastName(req.getLastName());
                s.setEmail(req.getEmail());
                s.setPassword(req.getPassword());
                // prevent elevating to admin via public register; set role to "staff"
                s.setRole("staff");
                staffRepository.save(s);
                return ResponseEntity.ok("Registration successful");
            }
            default:
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Unsupported role");
        }
    }
}
