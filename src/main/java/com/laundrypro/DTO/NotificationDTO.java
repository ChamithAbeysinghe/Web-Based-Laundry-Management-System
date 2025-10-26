package com.laundrypro.DTO;

import com.laundrypro.model.Notification;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class NotificationDTO {
    private Long id;
    private String message;
    private String type;
    private Long entityId;
    private String entityType;
    private boolean isRead;
    private String createdAt;
    private String readAt;

    public NotificationDTO() {
    }

    public NotificationDTO(Notification notification) {
        this.id = notification.getNotificationID();
        this.message = notification.getMessage();
        this.type = notification.getType();
        this.entityId = notification.getEntityId();
        this.entityType = notification.getEntityType();
        this.isRead = notification.isRead();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        this.createdAt = notification.getCreatedAt().format(formatter);

        if (notification.getReadAt() != null) {
            this.readAt = notification.getReadAt().format(formatter);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getReadAt() {
        return readAt;
    }

    public void setReadAt(String readAt) {
        this.readAt = readAt;
    }
}
