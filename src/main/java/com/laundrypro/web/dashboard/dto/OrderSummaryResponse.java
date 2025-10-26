package com.laundrypro.web.dashboard.dto;

import java.math.BigDecimal;
import java.util.Date;

public class OrderSummaryResponse {
    private Integer id;        // orderId
    private Date orderDate;    // entity date
    private String serviceType;
    private String status;
    private BigDecimal total;

    public OrderSummaryResponse() {}
    public OrderSummaryResponse(Integer id, Date orderDate, String serviceType, String status, BigDecimal total) {
        this.id = id;
        this.orderDate = orderDate;
        this.serviceType = serviceType;
        this.status = status;
        this.total = total;
    }

    public Integer getId() { return id; }
    public Date getOrderDate() { return orderDate; }
    public String getServiceType() { return serviceType; }
    public String getStatus() { return status; }
    public BigDecimal getTotal() { return total; }

    public void setId(Integer id) { this.id = id; }
    public void setOrderDate(Date orderDate) { this.orderDate = orderDate; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }
    public void setStatus(String status) { this.status = status; }
    public void setTotal(BigDecimal total) { this.total = total; }
}
