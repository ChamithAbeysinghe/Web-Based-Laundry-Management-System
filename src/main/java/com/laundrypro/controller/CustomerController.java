package com.laundrypro.controller;

import com.laundrypro.model.Customer;
import com.laundrypro.service.CustomerService;
import com.laundrypro.DTO.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService service;

    public CustomerController(CustomerService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Customer create(@RequestBody Customer customer) {
        return service.create(customer);
    }

    @GetMapping("/{id}")
    public Customer get(@PathVariable Integer id) {
        return service.get(id);
    }

    @GetMapping("/by-email")
    public Customer getByEmail(@RequestParam String email) {
        return service.getByEmail(email);
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        Customer existing = service.get(id);

        // Merge only allowed fields (no email change)
        if (body.containsKey("firstname")) existing.setFirstName(s(body.get("firstname")));
        if (body.containsKey("lastName") || body.containsKey("lastname")) {
            Object v = body.containsKey("lastName") ? body.get("lastName") : body.get("lastname");
            existing.setLastName(s(v));
        }
        if (body.containsKey("address")) existing.setAddress(s(body.get("address")));
        if (body.containsKey("phone")) existing.setPhone(s(body.get("phone")));

        // Password change (optional)
        String oldPassword = s(body.get("oldPassword"));
        String newPassword = s(body.get("newPassword"));
        if ((oldPassword != null && !oldPassword.isBlank()) || (newPassword != null && !newPassword.isBlank())) {
            if (oldPassword == null || !oldPassword.equals(existing.getPassword())) {
                throw new IllegalArgumentException("Old password is incorrect");
            }
            if (newPassword == null || newPassword.isBlank()) {
                throw new IllegalArgumentException("New password cannot be empty");
            }
            existing.setPassword(newPassword);
        }

        // Save merged entity
        Customer saved = service.saveMerged(existing);

        // Return the shape the dashboard uses, including address/phone and lowercase aliases via UserResponse
        return new UserResponse(
                saved.getCustomerId(),
                saved.getEmail(),
                saved.getFirstName(),
                saved.getLastName(),
                saved.getRole() == null ? "customer" : saved.getRole(),
                saved.getAddress(),
                saved.getPhone()
        );
    }



    @PatchMapping("/{id}/password")
    public Customer updatePassword(@PathVariable Integer id, @RequestParam String password) {
        return service.updatePassword(id, password);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        service.delete(id);
    }

    @GetMapping
    public Page<Customer> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "customerId,DESC") String sort, // e.g., "customerId,DESC" or "email,ASC"
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q
    ) {
        String[] sortParts = sort.split(",", 2);
        Sort.Direction dir = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));

        if (role != null && !role.isBlank()) {
            return service.filterByRole(role, pageable);
        }
        if (q != null && !q.isBlank()) {
            return service.search(q.trim(), pageable);
        }
        return service.list(pageable);
    }
    private String s(Object v) {
        return v == null ? null : String.valueOf(v).trim();
    }



}
