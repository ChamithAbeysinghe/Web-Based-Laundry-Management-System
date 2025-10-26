package com.laundrypro.web.dashboard;

import com.laundrypro.model.Customer;
import com.laundrypro.repository.CustomerRepository;
import com.laundrypro.DTO.UserResponse;
import com.laundrypro.web.dashboard.dto.CustomerSettingsUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
public class CustomerDashboardController {

    private final CustomerRepository customerRepository;

    public CustomerDashboardController(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    // PUT /api/customers/{id}/dashboard-settings
    @PutMapping("/{id}/dashboard-settings")
    public ResponseEntity<?> updateSettings(@PathVariable Integer id, @RequestBody CustomerSettingsUpdateRequest req) {
        Customer c = customerRepository.findById(id)
                .orElse(null);
        if (c == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Customer not found");
        }

        // Update profile fields (note FE uses lowercase keys)
        if (req.getFirstname() != null) c.setFirstName(req.getFirstname());
        if (req.getLastname() != null) c.setLastName(req.getLastname());
        if (req.getAddress() != null) c.setAddress(req.getAddress());
        if (req.getPhone() != null) c.setPhone(req.getPhone());

        // Optional password change flow
        if ((req.getOldPassword() != null && !req.getOldPassword().isBlank()) ||
            (req.getNewPassword() != null && !req.getNewPassword().isBlank())) {
            if (req.getOldPassword() == null || !req.getOldPassword().equals(c.getPassword())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Old password is incorrect");
            }
            if (req.getNewPassword() == null || req.getNewPassword().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("New password cannot be empty");
            }
            c.setPassword(req.getNewPassword());
        }

        Customer saved = customerRepository.save(c);

        // Return the user shape the FE stores in localStorage
        UserResponse resp = new UserResponse(
                saved.getCustomerId(),
                saved.getEmail(),
                saved.getFirstName(),
                saved.getLastName(),
                saved.getRole() == null ? "customer" : saved.getRole()
        );
        return ResponseEntity.ok(resp);
    }
}
