package com.laundrypro.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Simple health check controller to verify server connectivity.
 * Used by client applications to check if the server is online.
 */
@RestController
@RequestMapping("/api/health")
public class HealthCheckController {

    /**
     * Basic health check endpoint
     * @return A 200 OK response with timestamp and status information
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", System.currentTimeMillis());
        response.put("service", "LaundryPro API");

        return ResponseEntity.ok(response);
    }
}
