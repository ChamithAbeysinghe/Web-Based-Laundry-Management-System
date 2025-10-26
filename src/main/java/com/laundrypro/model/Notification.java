package com.laundrypro.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notificationID;

    private String message;

    private String type;

    @Column(name = "Entity_ID")
    private Long entityId;

    @Column(name = "Entity_Type")
    private String entityType;

    @Column(name = "Staff_ID")
    private Long staffId;

    @Column(name = "Is_Read")
    private boolean isRead;

    @Column(name = "Created_At")
    private LocalDateTime createdAt;

    @Column(name = "Read_At")
    private LocalDateTime readAt;

    @Column(name = "Customer_ID")
    private Integer customerId;

    // Default constructor
    public Notification() { }

    // Constructor for creating a new notification
    public Notification(String message, String type, Long entityId, String entityType, Long staffId) {
        this.message = message;
        this.type = type;
        this.entityId = entityId;
        this.entityType = entityType;
        this.staffId = staffId;
        this.isRead = false;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        // default state for new notifications
        if (!this.isRead) this.isRead = false;
    }

    // Getters and Setters
    public Long getNotificationID() {
        return notificationID;
    }

    public void setNotificationID(Long notificationID) {
        this.notificationID = notificationID;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getEntityId() {
        return entityId;
    }

    public void setEntityId(Long entityId) {
        this.entityId = entityId;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public Long getStaffId() {
        return staffId;
    }

    public void setStaffId(Long staffId) {
        this.staffId = staffId;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
        if (read) {
            this.readAt = LocalDateTime.now();
        }
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    public Integer getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Integer customerId) {
        this.customerId = customerId;
    }
}
