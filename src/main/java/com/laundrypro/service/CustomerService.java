package com.laundrypro.service;

import com.laundrypro.model.Customer;
import com.laundrypro.repository.CustomerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

@Service
@Transactional
public class CustomerService {

    private final CustomerRepository repo;

    public CustomerService(CustomerRepository repo) {
        this.repo = repo;
    }

    public Customer create(Customer c) {
        ensureRequired(c);
        if (repo.existsByEmail(c.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }
        return repo.save(c);
    }

    @Transactional(readOnly = true)
    public Customer get(Integer id) {
        return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Customer not found: " + id));
    }

    @Transactional(readOnly = true)
    public Customer getByEmail(String email) {
        return repo.findByEmail(email).orElseThrow(() -> new NoSuchElementException("Customer not found for email: " + email));
    }

    // New: save merged entity as-is (used by dashboard settings update)
    public Customer saveMerged(Customer c) {
        ensureRequired(c);
        return repo.save(c);
    }


    public Customer update(Integer id, Customer incoming) {
        Customer existing = get(id);

        // Handle email uniqueness if changed
        if (incoming.getEmail() != null && !incoming.getEmail().equalsIgnoreCase(existing.getEmail())) {
            if (repo.existsByEmail(incoming.getEmail())) {
                throw new IllegalArgumentException("Email already in use");
            }
            existing.setEmail(incoming.getEmail());
        }

        // Full replace for other fields (if null provided, it clears the value)
        existing.setFirstName(incoming.getFirstName());
        existing.setLastName(incoming.getLastName());
        existing.setPhone(incoming.getPhone());
        existing.setAddress(incoming.getAddress());
        existing.setRole(incoming.getRole());

        // Password update if provided
        if (incoming.getPassword() != null && !incoming.getPassword().isBlank()) {
            existing.setPassword(incoming.getPassword());
        }

        ensureRequired(existing);
        return repo.save(existing);
    }

    public Customer updatePassword(Integer id, String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }
        Customer existing = get(id);
        existing.setPassword(newPassword);
        return repo.save(existing);
    }

    public void delete(Integer id) {
        if (!repo.existsById(id)) {
            throw new NoSuchElementException("Customer not found: " + id);
        }
        repo.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Page<Customer> list(Pageable pageable) {
        return repo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Customer> filterByRole(String role, Pageable pageable) {
        return repo.findByRole(role, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Customer> search(String q, Pageable pageable) {
        return repo.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, q, pageable);
    }

    private void ensureRequired(Customer c) {
        if (c.getEmail() == null || c.getEmail().isBlank()) throw new IllegalArgumentException("email is required");
        if (c.getPassword() == null || c.getPassword().isBlank()) throw new IllegalArgumentException("password is required");
    }
}
