package com.laundrypro.service;

import com.laundrypro.model.Staff;
import com.laundrypro.repository.StaffRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

@Service
@Transactional
public class StaffService {

    private final StaffRepository repo;

    public StaffService(StaffRepository repo) {
        this.repo = repo;
    }

    public Staff create(Staff s) {
        ensureRequired(s);
        if (repo.existsByEmail(s.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }
        return repo.save(s);
    }

    @Transactional(readOnly = true)
    public Staff get(Integer id) {
        return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Staff not found: " + id));
    }

    @Transactional(readOnly = true)
    public Staff getByEmail(String email) {
        return repo.findByEmail(email).orElseThrow(() -> new NoSuchElementException("Staff not found for email: " + email));
    }

    public Staff update(Integer id, Staff incoming) {
        Staff existing = get(id);

        // Email change with uniqueness check
        if (incoming.getEmail() != null && !incoming.getEmail().equalsIgnoreCase(existing.getEmail())) {
            if (repo.existsByEmail(incoming.getEmail())) {
                throw new IllegalArgumentException("Email already in use");
            }
            existing.setEmail(incoming.getEmail());
        }

        // Replace other fields (null clears)
        existing.setFirstName(incoming.getFirstName());
        existing.setLastName(incoming.getLastName());
        existing.setRole(incoming.getRole());

        // Password update if provided
        if (incoming.getPassword() != null && !incoming.getPassword().isBlank()) {
            existing.setPassword(incoming.getPassword());
        }

        ensureRequired(existing);
        return repo.save(existing);
    }

    public Staff updatePassword(Integer id, String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Password cannot be empty");
        }
        Staff s = get(id);
        s.setPassword(newPassword);
        return repo.save(s);
    }

    public boolean changePasswordPlain(int staffId, String currentPassword, String newPassword) {
        Staff staff = get(staffId);
        if (!currentPassword.equals(staff.getPassword())) {
            return false;
        }
        staff.setPassword(newPassword);
        repo.save(staff);
        return true;
    }

    public boolean changeAdminPassword(String currentPassword, String newPassword) {
        Staff admin = repo.findByRole("admin", Pageable.unpaged()).stream().findFirst().orElse(null);
        if (admin == null) return false;
        if (!currentPassword.equals(admin.getPassword())) {
            return false;
        }
        admin.setPassword(newPassword);
        repo.save(admin);
        return true;
    }

    public void delete(Integer id) {
        if (!repo.existsById(id)) {
            throw new NoSuchElementException("Staff not found: " + id);
        }
        repo.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Page<Staff> list(Pageable pageable) {
        return repo.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Staff> filterByRole(String role, Pageable pageable) {
        return repo.findByRole(role, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Staff> search(String q, Pageable pageable) {
        return repo.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, q, pageable);
    }

    private void ensureRequired(Staff s) {
        if (s.getEmail() == null || s.getEmail().isBlank()) throw new IllegalArgumentException("email is required");
        if (s.getPassword() == null || s.getPassword().isBlank()) throw new IllegalArgumentException("password is required");
    }
}
