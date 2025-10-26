package com.laundrypro.controller;

import com.laundrypro.model.Staff;
import com.laundrypro.repository.StaffRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/debug")
public class StaffCheckController {

    private final StaffRepository staffRepository;

    public StaffCheckController(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    @GetMapping("/staff-count")
    public String checkStaffCount() {
        long count = staffRepository.count();
        return "Staff count: " + count;
    }
}
