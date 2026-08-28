# Testing Guide

## End-to-End Testing

### Prerequisites
- Backend running on http://localhost:3000
- Frontend running on http://localhost:5173

### Test Scenarios

#### 1. View Dashboard
**Steps:**
1. Open http://localhost:5173 in browser
2. Verify header shows "Watchers" with watch count

**Expected Result:**
- Page loads with three tabs: Overview, Manage Watches, Alerts
- Demo watch is visible in Overview section
- Credit balance shows 150 total (100 grant + 50 purchased)

#### 2. Create a New Watch

**Test: ASIN Watch**
```
Steps:
1. Click "New Watch" button
2. Select "Amazon ASIN" tab
3. Enter ASIN: B0BL1SHXRX (or any valid ASIN)
4. Set Condition: "Price drops"
5. Set Target Price: $99.99
6. Set Check Every: "6 hours"
7. Set Watch Duration: "1 month"
8. Click "Create Watch"

Expected Result:
- Dialog closes
- New watch appears in "Manage Watches" tab
- Alert count remains 0 until price changes
```

**Test: URL Watch**
```
Steps:
1. Click "New Watch" button
2. Select "Custom URL" tab
3. Enter URL: https://example.com/product
4. Set Condition: "Price changes"
5. Leave other settings as default
6. Click "Create Watch"

Expected Result:
- Watch created successfully
- Appears in watch list
```

#### 3. Manage Watches

**Test: Snooze Watch**
```
Steps:
1. Go to "Manage Watches" tab
2. Click "Snooze" button on a watch
3. Verify the watch status

Expected Result:
- Badge shows "Snoozed"
- Button changes to "Resume"
- Can be resumed by clicking the button again
```

**Test: Archive Watch**
```
Steps:
1. Go to "Manage Watches" tab
2. Click trash icon on a watch
3. Refresh page

Expected Result:
- Watch is removed from active list
- Watch count decreases
- Can be found in archived section if implemented
```

**Test: Change Check Interval**
```
Steps:
1. Go to "Manage Watches" tab
2. Note current interval
3. Click watch to expand options (if implemented)
4. Change interval

Expected Result:
- Interval updates
- Next poll scheduled accordingly
```

#### 4. View Alerts

**Steps:**
1. Go to "Alerts" tab
2. Verify demo alert is visible
3. Check alert shows correct info:
   - Product image
   - Title
   - What changed message
   - Time triggered
   - Delivery status

**Expected Result:**
- Alert displays with green "Sent" badge
- Multiple alerts can be displayed in reverse chronological order

#### 5. Simulate Alert

**Steps:**
1. Go to "Manage Watches" tab
2. Click lightning bolt icon on any watch
3. Refresh Alerts tab

**Expected Result:**
- New alert appears in Alerts tab
- Alert shows timestamp from now
- Alert status is "Sent"

#### 6. Credits and Usage

**Steps:**
1. Go to Overview tab
2. Check Credits card

**Expected Result:**
- Total: 150
- Grant: 100
- Purchased: 50
- Refill date shown (30 days from now)

### API Testing

#### Test Backend Health
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok"}`

#### Test tRPC Endpoints

**List Watches:**
```bash
curl -X POST http://localhost:3000/trpc/listWatches \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Get Credits:**
```bash
curl -X POST http://localhost:3000/trpc/getCredits \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Create Watch:**
```bash
curl -X POST http://localhost:3000/trpc/createWatch \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "targetType": "asin",
      "asin": "B0BL1SHXRX",
      "marketplace": 1,
      "condition": "price_drop",
      "thresholdCents": 9999,
      "pollIntervalMinutes": 360,
      "expiresAt": "2025-12-31T23:59:59Z"
    }
  }'
```

### Performance Testing

#### Frontend Load Time
```bash
# Using Lighthouse (in Chrome DevTools)
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Run audit for Performance
4. Target: Score > 90
```

#### Backend Response Time
```bash
# Test with Apache Bench
ab -n 100 -c 10 http://localhost:3000/health

# Expected: < 50ms average response time
```

### Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (iOS)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Accessibility Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Shift+Tab to go backward
   - Enter/Space to activate buttons
   - Arrow keys in dropdowns

2. **Screen Reader** (NVDA/JAWS)
   - All buttons have accessible names
   - Form labels associated with inputs
   - Alert messages announced

3. **Color Contrast**
   - Text vs background: 4.5:1 minimum (WCAG AA)
   - Use: https://webaim.org/resources/contrastchecker/

4. **Mobile Responsiveness**
   - Test on 375px, 768px, 1024px widths
   - Touch targets >= 44x44 pixels
   - No horizontal scrolling

### Mobile Testing

**iOS (Safari)**
```bash
# Using simulator
1. Open Xcode
2. Xcode > Open Developer Tool > Simulator
3. Select iPhone model
4. Visit http://localhost:5173
```

**Android (Chrome)**
```bash
# Using Device/Emulator
adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -a android.intent.action.VIEW -d http://localhost:5173
```

### Error Handling

**Test Network Errors:**
1. Start frontend, kill backend
2. Try to create a watch
3. Verify error message appears

**Test Invalid Inputs:**
1. Try to create watch with invalid ASIN (too long)
2. Try to create watch with invalid URL
3. Set past expiration date
4. Set negative threshold price

### Data Persistence

**Test Demo Data:**
1. Refresh page (F5)
2. Verify demo watch and alert still visible
3. Create new watch
4. Refresh page
5. Verify new watch persists (in-memory)

**Note:** In-memory storage clears when server restarts

### Stress Testing

**Create Multiple Watches:**
```bash
# Script to create 50 watches
for i in {1..50}; do
  curl -X POST http://localhost:3000/trpc/createWatch \
    -H "Content-Type: application/json" \
    -d "{
      \"json\": {
        \"targetType\": \"asin\",
        \"asin\": \"B0BL${i}\",
        \"marketplace\": 1,
        \"condition\": \"price_drop\",
        \"pollIntervalMinutes\": 360,
        \"expiresAt\": \"2025-12-31T23:59:59Z\"
      }
    }"
done
```

Expected: Frontend handles 50+ watches without performance degradation

## Continuous Testing

### Pre-Deployment Checklist

- [ ] All manual tests pass
- [ ] No console errors
- [ ] No console warnings (except third-party)
- [ ] All features work as documented
- [ ] Mobile layout responsive
- [ ] Keyboard navigation works
- [ ] No hardcoded URLs
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Error messages user-friendly

### Automated Testing (Future)

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Debugging

### Browser DevTools

**Console:**
- Check for errors/warnings
- Log state: `console.log(state)`
- Test API: `trpc.client.query('listWatches')`

**Network:**
- Monitor tRPC calls to `/trpc`
- Check response sizes (< 50KB ideal)
- Verify CORS headers

**Performance:**
- Check for layout thrashing
- Monitor for memory leaks
- Profile slow components

### Backend Debugging

```bash
# Enable verbose logging
DEBUG=* npm run backend:dev

# Use Node debugger
node --inspect-brk backend/dist/server.js
# Then: chrome://inspect
```

## Test Report Template

```markdown
# Watchers MVP Test Report

Date: YYYY-MM-DD
Tester: [Name]
Environment: [dev/staging/prod]

## Summary
- Tests Run: X
- Tests Passed: X
- Tests Failed: X
- Tests Skipped: X

## Test Results

### Critical (Must Pass)
- [ ] Create watch
- [ ] View watches
- [ ] Archive watch
- [ ] View alerts

### High Priority
- [ ] Snooze/resume watch
- [ ] Update watch settings
- [ ] Credits display

### Medium Priority
- [ ] Mobile responsive
- [ ] Keyboard navigation
- [ ] Error messages

## Issues Found
1. [Issue Title]
   - Severity: [Critical/High/Medium/Low]
   - Steps to Reproduce: ...
   - Expected: ...
   - Actual: ...

## Sign-Off
Tester: ___________
Date: ___________
Approved for: [Dev/Staging/Production]
```
