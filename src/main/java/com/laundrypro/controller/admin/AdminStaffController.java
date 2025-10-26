package com.laundrypro.controller.admin;

import com.laundrypro.model.Staff;
import com.laundrypro.service.StaffService;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/staff")
public class AdminStaffController {

    private final StaffService staff;

    public AdminStaffController(StaffService staff) {
        this.staff = staff;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Staff create(@RequestBody Staff s) {
        // Normalize to "staff" if not explicitly admin
        if (s.getRole() == null || s.getRole().isBlank()) s.setRole("staff");
        return staff.create(s);
    }

    @GetMapping("/{id}")
    public Staff get(@PathVariable Integer id) {
        return staff.get(id);
    }

    @PutMapping("/{id}")
    public Staff update(@PathVariable Integer id, @RequestBody Staff s) {
        return staff.update(id, s);
    }

    @PatchMapping("/{id}/password")
    public Staff updatePassword(@PathVariable Integer id, @RequestParam String password) {
        return staff.updatePassword(id, password);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        staff.delete(id);
    }

    @GetMapping
    public Page<Staff> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "staffId,DESC") String sort,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String q
    ) {
        String[] parts = sort.split(",", 2);
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, parts[0]));
        if (role != null && !role.isBlank()) return staff.filterByRole(role, pageable);
        if (q != null && !q.isBlank()) return staff.search(q.trim(), pageable);
        return staff.list(pageable);
    }
}
