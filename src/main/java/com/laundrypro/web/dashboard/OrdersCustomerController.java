package com.laundrypro.web.dashboard;

import com.laundrypro.model.Orders;
import com.laundrypro.repository.OrdersRepository;
import com.laundrypro.service.OrdersService;
import com.laundrypro.web.dashboard.dto.OrderSummaryResponse;
import com.laundrypro.web.dashboard.dto.PlaceOrderRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

import com.laundrypro.model.Customer;
import com.laundrypro.repository.CustomerRepository;


@RestController
@RequestMapping("/api/orders")
public class OrdersCustomerController {

    private final OrdersRepository ordersRepository;
    private final CustomerRepository customerRepository;
    private final OrdersService ordersService;

    public OrdersCustomerController(OrdersRepository ordersRepository, CustomerRepository customerRepository, OrdersService ordersService) {
        this.ordersRepository = ordersRepository;
        this.customerRepository = customerRepository;
        this.ordersService = ordersService;
    }

    // GET /api/orders/customer/{customerId}
    @GetMapping("/customer/{customerId}")
    public List<OrderSummaryResponse> getOrdersForCustomer(@PathVariable Integer customerId) {
        return ordersRepository.findAllByCustomerId(customerId).stream()
                .sorted(Comparator.comparing(Orders::getDate).reversed())
                .map(o -> new OrderSummaryResponse(
                        o.getOrderId(),
                        o.getDate(),
                        o.getServiceType(),
                        o.getStatus(),
                        o.getTotal()
                ))
                .collect(Collectors.toList());
    }

    // POST /api/orders/place
    @PostMapping("/place")
    public ResponseEntity<Map<String, Object>> placeOrder(@RequestBody PlaceOrderRequest req) {
        Map<String, Object> res = new HashMap<>();

        // Basic validation to match FE expectations
        if (req.getCustomer() == null || req.getCustomer().getId() == null) {
            res.put("message", "Missing customer id");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
        }
        if (req.getServiceType() == null || req.getServiceType().isBlank()) {
            res.put("message", "Service type is required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
        }
        if (req.getSubTotal() == null || req.getTax() == null) {
            res.put("message", "Subtotal and tax are required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
        }

        // Fetch customer to populate denormalized fields
        Optional<Customer> customerOpt = customerRepository.findById(req.getCustomer().getId());
        if (customerOpt.isEmpty()) {
            res.put("message", "Customer not found");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
        }
        Customer customer = customerOpt.get();

        Orders o = new Orders();
        o.setCustomerId(customer.getCustomerId());
        // Populate name and address so they are NOT null in Orders table
        String fullName = String.join(" ",
                Optional.ofNullable(customer.getFirstName()).orElse("").trim(),
                Optional.ofNullable(customer.getLastName()).orElse("").trim()
        ).trim();
        o.setCustomerName(fullName.isEmpty() ? customer.getEmail() : fullName);
        o.setAddress(customer.getAddress());

        o.setServiceType(req.getServiceType());
        o.setItems(req.getItems());
        // Map plural from FE to singular in entity
        o.setSpecialInstruction(req.getSpecialInstructions());
        o.setSubTotal(safe(req.getSubTotal()));
        o.setTax(safe(req.getTax()));
        BigDecimal computed = o.getSubTotal().add(o.getTax());
        o.setTotal(req.getTotal() == null ? computed : req.getTotal());
        if (o.getTotal().compareTo(computed) != 0) {
            o.setTotal(computed);
        }
        o.setStatus("Order Placed");

        Date date = new Date();
        if (req.getOrderDate() != null && !req.getOrderDate().isBlank()) {
            date = parseFlexibleDate(req.getOrderDate(), date);
        }
        o.setDate(date);

        // Use ordersService instead of directly using repository to ensure notifications are triggered
        Orders saved = ordersService.create(o);

        res.put("message", "Order placed successfully");
        res.put("orderId", saved.getOrderId());
        return ResponseEntity.ok(res);
    }


    private BigDecimal safe(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    // Accepts formats like "2025-09-20" or ISO "2025-09-20T10:20:30Z"
    private Date parseFlexibleDate(String input, Date fallback) {
        List<String> patterns = Arrays.asList("yyyy-MM-dd", "yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX");
        for (String p : patterns) {
            try {
                return new SimpleDateFormat(p).parse(input);
            } catch (ParseException ignored) {}
        }
        return fallback;
    }

    // PATCH /api/orders/{orderId}/payment?paymentId=123
    @PatchMapping("/{orderId}/payment")
    public ResponseEntity<Map<String, Object>> attachPayment(
            @PathVariable Integer orderId,
            @RequestParam Integer paymentId
    ) {
        Optional<Orders> opt = ordersRepository.findById(orderId);
        if (opt.isEmpty()) {
            Map<String, Object> res = new HashMap<>();
            res.put("message", "Order not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(res);
        }
        Orders o = opt.get();
        o.setPaymentId(paymentId);
        ordersRepository.save(o);

        Map<String, Object> res = new HashMap<>();
        res.put("orderId", orderId);
        res.put("paymentId", paymentId);
        res.put("message", "Payment attached to order");
        return ResponseEntity.ok(res);
    }
}
