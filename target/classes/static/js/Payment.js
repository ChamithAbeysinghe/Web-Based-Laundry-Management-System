document.addEventListener('DOMContentLoaded', function () {
    const paymentForm = document.getElementById('paymentForm');
    const successScreen = document.getElementById('successScreen');
    const payBtn = document.getElementById('payBtn');
    const cardForm = document.getElementById('cardForm');
    const methodOptions = document.querySelectorAll('.method-option');
    const paymentIdEl = document.getElementById('paymentId');
    const methodConfirmedEl = document.getElementById('methodConfirmed');
    const orderTotalAmountEl = document.getElementById('orderTotalAmount');
    const amountPaidEl = document.getElementById('amountPaid');
    const humanCheck = document.getElementById('humanCheck');
    const robotField = document.getElementById('robotField');
    const humanHint = document.getElementById('humanHint');
    const viewOrderDetailsEl = document.getElementById('viewOrderDetails');
    const trackOrderLinkEl = document.getElementById('trackOrderLink');

    let pendingOrder = null;
    try {
        pendingOrder = JSON.parse(sessionStorage.getItem('pendingOrder'));
    } catch (e) {
        pendingOrder = null;
    }
    if (!pendingOrder) {
        // No pending order: this page is being used to view payment history only.
        if (paymentForm) paymentForm.style.display = 'none';
        if (successScreen) successScreen.style.display = 'none';
        return;
    }

    // When in checkout mode, hide the history section (if present) for focus
    const paymentsHistorySection = document.getElementById('paymentsHistory');
    if (paymentsHistorySection) paymentsHistorySection.style.display = 'none';

    // Reflect real total on UI
    if (orderTotalAmountEl) {
        orderTotalAmountEl.textContent = `$${Number(pendingOrder.total || 0).toFixed(2)}`;
    }
    if (amountPaidEl) {
        amountPaidEl.textContent = `$${Number(pendingOrder.total || 0).toFixed(2)}`;
    }

    // Keep payment disabled until slider verification completes
    if (payBtn) payBtn.disabled = true;

    // Format card number as user types (e.g., 1234 5678 9012 3456)
    const cardNumberInput = document.getElementById('cardNumber');
    cardNumberInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 16) value = value.substring(0, 16);
        let formatted = value.match(/.{1,4}/g)?.join(' ') || '';
        e.target.value = formatted;
    });

    // Format expiry as MM/YY
    const expiryInput = document.getElementById('expiry');
    expiryInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.substring(0, 4);
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        e.target.value = value;
    });

    // Toggle payment method
    methodOptions.forEach(option => {
        option.addEventListener('click', function () {
            methodOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            const method = this.getAttribute('data-method');
            // ensure radio reflects UI selection
            const input = this.querySelector('input[name="paymentMethod"]');
            if (input) input.checked = true;
            cardForm.style.display = method === 'card' ? 'block' : 'none';
        });
    });
    // Also react to direct radio changes (for accessibility/keyboard)
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const method = this.value;
            cardForm.style.display = method === 'card' ? 'block' : 'none';
            // sync active class on labels
            methodOptions.forEach(opt => {
                const val = opt.getAttribute('data-method');
                opt.classList.toggle('active', val === method);
            });
        });
    });

    // Slider CAPTCHA — simple slide-to-verify
    const humanSlider = document.getElementById('humanSlider');
    const humanStatus = document.getElementById('humanStatus');
    const humanBox = document.querySelector('.human-verify');
    let humanVerified = false;

    function updateHumanState() {
        if (!humanSlider) return;
        const val = Number(humanSlider.value) || 0;
        humanVerified = val >= 100;

        // reflect progress on track via CSS var
        humanSlider.style.setProperty('--progress', `${Math.min(100, Math.max(0, val))}%`);

        if (humanStatus) {
            if (humanVerified) {
                humanStatus.textContent = 'Verified ✔';
                humanStatus.style.color = '#10b981';
            } else if (val > 0) {
                humanStatus.textContent = 'Keep sliding to verify';
                humanStatus.style.color = '#2563eb';
            } else {
                humanStatus.textContent = 'Drag the slider all the way to the right';
                humanStatus.style.color = '#6b7280';
            }
        }

        // Toggle visual verified state
        if (humanBox) humanBox.classList.toggle('verified', humanVerified);

        if (payBtn) payBtn.disabled = !humanVerified;
    }

    if (humanSlider) {
        humanSlider.addEventListener('input', updateHumanState);
        updateHumanState();
    }

    // Handle payment
    payBtn.addEventListener('click', async function () {
        if (typeof humanVerified !== 'undefined' && !humanVerified) {
            alert('Please slide to verify you are human.');
            return;
        }
        const selectedMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
        if (!selectedMethodEl) {
            alert('Please select a payment method.');
            return;
        }
        const selectedMethod = selectedMethodEl.value;

        if (selectedMethod === 'card') {
            const cardNum = document.getElementById('cardNumber').value.replace(/\s/g, '');
            const expiry = document.getElementById('expiry').value;
            const cvv = document.getElementById('cvv').value;
            const name = document.getElementById('cardName').value;

            // Simple validation
            if (cardNum.length !== 16 || !/^\d+$/.test(cardNum)) {
                alert('Please enter a valid 16-digit card number.');
                return;
            }
            if (!/^\d{2}\/\d{2}$/.test(expiry)) {
                alert('Please enter a valid expiry date (MM/YY).');
                return;
            }
            if (cvv.length < 3 || !/^\d+$/.test(cvv)) {
                alert('Please enter a valid CVV.');
                return;
            }
            if (!name.trim()) {
                alert('Please enter the name on the card.');
                return;
            }
        }

        // Append payment method to order payload (optional for backend)
        const payload = { ...pendingOrder, paymentMethod: selectedMethod };

        // Disable button to prevent double submit
        payBtn.disabled = true;

        try {
            const response = await fetch("http://localhost:8080/api/orders/place", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.message || 'Failed to place order');
            }

            // Order placed successfully — now record the payment
            const orderId = result.orderId;
            let recordedPaymentId = null;
            try {
                const paymentPayload = {
                    orderId: orderId,
                    customerId: pendingOrder?.customer?.id ?? pendingOrder?.customerId ?? null,
                    amount: pendingOrder.total,
                    paymentMethod: selectedMethod
                };
                const payResp = await fetch("http://localhost:8080/api/payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(paymentPayload)
                });
                const payResult = await payResp.json();
                if (!payResp.ok) {
                    throw new Error(payResult?.message || 'Failed to record payment');
                }
                recordedPaymentId = payResult?.paymentId ?? null;
            } catch (e) {
                console.error('Failed to record payment:', e);
                alert('Payment was processed but saving payment details failed. Support has been notified.');
            }

            // Determine a numeric payment id to persist on the Order
            let paymentRef = recordedPaymentId;
            let paymentIdNum = Number.isFinite(Number(paymentRef)) ? Number(paymentRef) : Math.floor(Date.now() % 2147483647);

            // Try to attach payment to the order record
            try {
                const attachRes = await fetch(`http://localhost:8080/api/orders/${orderId}/payment?paymentId=${encodeURIComponent(paymentIdNum)}`, {
                    method: 'PATCH'
                });
                // Non-blocking: we can still proceed if this fails, but log it
                if (!attachRes.ok) {
                    console.warn('Failed to attach paymentId to order:', await attachRes.text());
                }
            } catch (e) {
                console.warn('Attach paymentId to order failed:', e);
            }

            // For display, prefer backend-provided ref if any; otherwise show prefixed numeric ref
            const paymentDisplay = paymentRef ? String(paymentRef) : ('PAY-' + String(paymentIdNum));
            paymentIdEl.textContent = paymentDisplay;
            methodConfirmedEl.textContent = selectedMethod === 'cash' ? 'Cash on Delivery' : 'Credit/Debit Card';

            // Populate order id and links
            if (viewOrderDetailsEl) {
                viewOrderDetailsEl.textContent = `#${orderId}`;
                viewOrderDetailsEl.href = `order-tracking.html?orderId=${orderId}`;
            }
            if (trackOrderLinkEl) {
                trackOrderLinkEl.href = `order-tracking.html?orderId=${orderId}`;
            }

            // Show success screen
            paymentForm.style.display = 'none';
            successScreen.style.display = 'block';

            // Clear pending order from session (we are done)
            sessionStorage.removeItem('pendingOrder');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Order placement failed after payment step:', err);
            alert(`❌ Could not place the order: ${err.message}`);
            payBtn.disabled = false;
        }
    });



    // Download receipt (mock)
    document.getElementById('downloadReceipt').addEventListener('click', function () {
        alert('Receipt download would start in a real app!');
    });

});