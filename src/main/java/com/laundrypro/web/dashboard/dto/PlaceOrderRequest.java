package com.laundrypro.web.dashboard.dto;

import java.math.BigDecimal;

public class PlaceOrderRequest {
    public static class CustomerRef { private Integer id; public Integer getId(){return id;} public void setId(Integer id){this.id=id;} }

    private CustomerRef customer;        // { id: number }
    private String serviceType;          // "wash-fold" | "dry-clean" | "linens"
    private String items;                // JSON string from frontend
    private String specialInstructions;  // note plural from FE
    private BigDecimal subTotal;
    private BigDecimal tax;
    private BigDecimal total;
    private String orderDate;            // ISO date string (YYYY-MM-DD or ISO)

    public CustomerRef getCustomer() { return customer; }
    public void setCustomer(CustomerRef customer) { this.customer = customer; }
    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }
    public String getItems() { return items; }
    public void setItems(String items) { this.items = items; }
    public String getSpecialInstructions() { return specialInstructions; }
    public void setSpecialInstructions(String specialInstructions) { this.specialInstructions = specialInstructions; }
    public BigDecimal getSubTotal() { return subTotal; }
    public void setSubTotal(BigDecimal subTotal) { this.subTotal = subTotal; }
    public BigDecimal getTax() { return tax; }
    public void setTax(BigDecimal tax) { this.tax = tax; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getOrderDate() { return orderDate; }
    public void setOrderDate(String orderDate) { this.orderDate = orderDate; }
}
