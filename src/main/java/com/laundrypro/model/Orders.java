package com.laundrypro.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Date;

@Entity
@Table(name = "Orders")
public class Orders {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "OrderID")
    private Integer orderId;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "Date", nullable = false)
    private Date date;

    @Column(name = "Customer_ID", nullable = false)
    private Integer customerId;

    @Column(name = "Customer_name")
    private String customerName;

    @Column(name = "Address")
    private String address;

    @Column(name = "items")
    private String items;

    @Column(name = "Service_Type")
    private String serviceType;

    @Column(name = "Sub_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal subTotal;

    @Column(name = "Tax", nullable = false, precision = 10, scale = 2)
    private BigDecimal tax;

    @Column(name = "Total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "Payment_ID")
    private Integer paymentId;

    @Column(name = "Special_Instruction", columnDefinition = "TEXT")
    private String specialInstruction;

    @Column(name = "Status", nullable = false, length = 50)
    private String status;

    @Column(name = "Staff_ID")
    private Integer staffId;

    public Integer getOrderId() { return orderId; }
    public void setOrderId(Integer orderId) { this.orderId = orderId; }
    public Date getDate() { return date; }
    public void setDate(Date date) { this.date = date; }
    public Integer getCustomerId() { return customerId; }
    public void setCustomerId(Integer customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getItems() { return items; }
    public void setItems(String items) { this.items = items; }
    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }
    public BigDecimal getSubTotal() { return subTotal; }
    public void setSubTotal(BigDecimal subTotal) { this.subTotal = subTotal; }
    public BigDecimal getTax() { return tax; }
    public void setTax(BigDecimal tax) { this.tax = tax; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public Integer getPaymentId() { return paymentId; }
    public void setPaymentId(Integer paymentId) { this.paymentId = paymentId; }
    public String getSpecialInstruction() { return specialInstruction; }
    public void setSpecialInstruction(String specialInstruction) { this.specialInstruction = specialInstruction; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getStaffId() { return staffId; }
    public void setStaffId(Integer staffId) { this.staffId = staffId; }
}
