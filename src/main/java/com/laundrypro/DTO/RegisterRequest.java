package com.laundrypro.DTO;

public class RegisterRequest {
    private String firstName;
    private String lastName;
    private String email;
    private String phone;   // customers only
    private String address; // customers only
    private String password;
    private String role;    // "customer" | "staff" (admin registration typically restricted)

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName == null ? null : firstName.trim(); }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName == null ? null : lastName.trim(); }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email == null ? null : email.trim(); }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone == null ? null : phone.trim(); }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address == null ? null : address.trim(); }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password == null ? null : password.trim(); }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role == null ? null : role.trim().toLowerCase(); }
}
