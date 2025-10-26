package com.laundrypro.DTO;

public class LoginRequest {
    private String email;
    private String password;
    private String role; // "customer" | "staff" | "admin"

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email == null ? null : email.trim(); }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password == null ? null : password.trim(); }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role == null ? null : role.trim().toLowerCase(); }
}
