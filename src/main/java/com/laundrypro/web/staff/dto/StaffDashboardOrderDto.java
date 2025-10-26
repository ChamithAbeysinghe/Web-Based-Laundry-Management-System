package com.laundrypro.web.staff.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.Date;

public class StaffDashboardOrderDto {
    @JsonProperty("order_id")
    private Integer orderId;

    @JsonProperty("customer_name")
    private String customerName;

    @JsonProperty("customer_address")
    private String customerAddress;

    @JsonProperty("status")
    private String status;

    @JsonProperty("staff_id")
    private Integer staffId;

    // For convenience in UI (uses same staffId)
    @JsonProperty("delivery_staff_id")
    private Integer deliveryStaffId;

    @JsonProperty("items")
    private String items;

    @JsonProperty("service_type")
    private String serviceType;

    @JsonProperty("total")
    private BigDecimal total;

    @JsonProperty("order_date")
    private Date orderDate;

    public StaffDashboardOrderDto(Integer orderId,
                                  String customerName,
                                  String customerAddress,
                                  String status,
                                  Integer staffId,
                                  String items,
                                  String serviceType,
                                  BigDecimal total,
                                  Date orderDate) {
        this.orderId = orderId;
        this.customerName = customerName;
        this.customerAddress = customerAddress;
        this.status = status;
        this.staffId = staffId;
        this.deliveryStaffId = staffId; // same column for now
        this.items = items;
        this.serviceType = serviceType;
        this.total = total;
        this.orderDate = orderDate;
    }

    public Integer getOrderId() { return orderId; }
    public String getCustomerName() { return customerName; }
    public String getCustomerAddress() { return customerAddress; }
    public String getStatus() { return status; }
    public Integer getStaffId() { return staffId; }
    public Integer getDeliveryStaffId() { return deliveryStaffId; }
    public String getItems() { return items; }
    public String getServiceType() { return serviceType; }
    public BigDecimal getTotal() { return total; }
    public Date getOrderDate() { return orderDate; }
}
