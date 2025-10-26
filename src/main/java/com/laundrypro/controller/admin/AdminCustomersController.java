package com.laundrypro.controller.admin;

import com.laundrypro.model.Customer;
import com.laundrypro.service.CustomerService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/customers")
public class AdminCustomersController {

    private final CustomerService customers;

    public AdminCustomersController(CustomerService customers) {
        this.customers = customers;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Customer create(@RequestBody Customer c) {
        // Force role to "customer" if missing
        if (c.getRole() == null || c.getRole().isBlank()) c.setRole("customer");
        return customers.create(c);
    }

    @GetMapping("/{id}")
    public Customer get(@PathVariable Integer id) {
        return customers.get(id);
    }

    @PutMapping("/{id}")
    public Customer update(@PathVariable Integer id, @RequestBody Customer c) {
        return customers.update(id, c);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        customers.delete(id);
    }

    @GetMapping
    public Page<Customer> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "customerId,DESC") String sort,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q
    ) {
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, parts[0]));
        if (role != null && !role.isBlank()) return customers.filterByRole(role, pageable);
        if (q != null && !q.isBlank()) return customers.search(q.trim(), pageable);
        return customers.list(pageable);
    }
}
