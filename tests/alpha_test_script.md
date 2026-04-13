# Alpha User Testing Script — OFS
# Conduct observed testing with a small set of users on core tasks.
# Observer records: time on task, number of clicks, errors encountered, and verbal feedback.

## Test Environment Setup
- Backend running: `uvicorn main:app --reload --port 8000`
- Frontend running: `cd frontend && npm run dev` (http://localhost:5173)
- Database seeded with test data
- Browser: Chrome or Firefox (latest)

## Participant Profile
- Non-developer user (friend, classmate, or family member)
- No prior experience with the OFS application
- Provide: laptop with browser open to http://localhost:5173

---

## Task 1: Registration & Login
**Goal**: Can the user create an account and log in?

**Steps for participant**:
1. "Please create a new account on this grocery website"
2. "Now log out and log back in with your new account"

**Observe**:
- [ ] Time to complete registration
- [ ] Any confusion with form fields
- [ ] Password validation feedback clear?
- [ ] Login redirects to correct page (customer home)
- [ ] Session persists on page refresh

**Expected outcome**: User lands on browsing page after login

---

## Task 2: Product Browsing & Search
**Goal**: Can the user find specific products?

**Steps for participant**:
1. "Find organic apples on this website"
2. "Show me all dairy products"
3. "Find products under $5"

**Observe**:
- [ ] Time to locate search bar
- [ ] Search returns relevant results
- [ ] Category filter is discoverable
- [ ] Price filter works as expected
- [ ] Out-of-stock items clearly indicated
- [ ] Product cards show useful information (price, weight, stock)

**Expected outcome**: User can find and filter products within 1-2 minutes

---

## Task 3: Cart Management
**Goal**: Can the user add items and manage their cart?

**Steps for participant**:
1. "Add 2 apples to your cart"
2. "Add some milk to your cart"
3. "Change the apple quantity to 3"
4. "Remove the milk from your cart"
5. "Check your cart total"

**Observe**:
- [ ] Add-to-cart button is discoverable
- [ ] Quantity controls (+/-) are intuitive
- [ ] Cart updates immediately
- [ ] Cart total and weight are accurate
- [ ] Delivery fee explanation is clear
- [ ] Cart accessible from navbar

**Expected outcome**: User manages cart without confusion

---

## Task 4: Checkout Flow
**Goal**: Can the user complete a purchase?

**Steps for participant**:
1. "Purchase the items in your cart"
2. "Enter a delivery address: 123 Test St, San Jose, CA"

**Observe**:
- [ ] Checkout button is discoverable
- [ ] Checkout modal shows correct summary
- [ ] Delivery address field is clear
- [ ] Payment section is understandable (mock)
- [ ] Confirmation page shows order details
- [ ] Cart is cleared after checkout

**Expected outcome**: User completes checkout and sees confirmation

---

## Task 5: Order History
**Goal**: Can the user find their past orders?

**Steps for participant**:
1. "Find your recent order"
2. "Check what items were in that order"

**Observe**:
- [ ] "My Orders" link is discoverable in navbar
- [ ] Order history page loads correctly
- [ ] Order cards show status, total, and date
- [ ] Expanding an order shows item details
- [ ] Price breakdown is accurate

**Expected outcome**: User finds and reviews their order within 30 seconds

---

## Task 6: Error Recovery
**Goal**: Can the user recover from common errors?

**Steps for participant**:
1. "Try to log in with a wrong password"
2. "Try to add more items than are in stock"

**Observe**:
- [ ] Error messages are clear and helpful
- [ ] User can recover without reloading
- [ ] No confusing technical errors shown
- [ ] Stock limits are enforced in the UI

**Expected outcome**: User understands what went wrong and how to fix it

---

## Task 7: Admin Functions (use admin@ofs.com / admin123)
**Goal**: Can an admin manage inventory?

**Steps for participant**:
1. "Log in as the store manager"
2. "Check the current inventory"
3. "Add a new product called 'Organic Bananas' priced at $3.99"
4. "Update the stock of an existing product"

**Observe**:
- [ ] Admin dashboard is intuitive
- [ ] Navigation between admin sections is clear
- [ ] Product creation form is understandable
- [ ] Stock updates reflect immediately
- [ ] Role-based access works (admin sees admin pages)

**Expected outcome**: Admin completes inventory tasks without help

---

## Post-Test Questionnaire
Ask the participant after all tasks:

1. On a scale of 1-5, how easy was it to use? (1=very difficult, 5=very easy)
2. What was the most confusing part?
3. What did you like most?
4. Would you use this to order groceries? Why or why not?
5. Any suggestions for improvement?

## Observer Notes Template

| Task | Time (sec) | Clicks | Errors | Pass/Fail | Notes |
|------|-----------|--------|--------|-----------|-------|
| 1. Registration & Login | | | | | |
| 2. Product Search | | | | | |
| 3. Cart Management | | | | | |
| 4. Checkout | | | | | |
| 5. Order History | | | | | |
| 6. Error Recovery | | | | | |
| 7. Admin Functions | | | | | |

## Summary
- Total test duration: _____ minutes
- Critical issues found: _____
- Participant satisfaction score: _____/5
