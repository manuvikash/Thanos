# Customer Switching Test Plan

## Test Scenario: Rapid Customer Switching

### Expected Behavior:
1. **Initial State**: No findings, no metrics displayed
2. **Select Customer A**: Shows empty state (no findings until "Run Scan" clicked)
3. **Click "Run Scan"**: Shows findings for Customer A
4. **Select Customer B**: Immediately clears findings/metrics, shows empty state
5. **Rapidly switch A → B → A**: Only the final selection (A) should stick

### Debug Logs to Check:

When you select a customer in the dropdown, you should see this sequence in browser console:

```
[useScanLogic] handleCustomerChange called with: customer-XXXXXXX
[useScanLogic] Setting customer: [Customer Name]
[HorizontalScanBar] selectedCustomer changed: [Customer Name]
[ContentArea] Customer changed: [Customer Name]
[App] Resetting all scan data
[useDashboardMetrics] Clearing metrics - no tenantId
```

### If Switching Rapidly (Customer A → Customer B):

```
[useScanLogic] handleCustomerChange called with: customer-A
[useScanLogic] Setting customer: Customer A
[useScanLogic] handleCustomerChange called with: customer-B
[useScanLogic] Skipping stale customer update: Customer A  ← Should see this!
[useScanLogic] Setting customer: Customer B
```

### Test Steps:

1. **Open browser console** (F12 → Console tab)
2. **Refresh the page** - should see NO findings/metrics
3. **Select Customer 1** from dropdown
   - ✅ Console shows reset logs
   - ✅ Dashboard shows empty state (no metrics)
   - ✅ Findings table is empty
4. **Click "Run Scan"** button
   - ✅ Scan executes
   - ✅ Findings appear
   - ✅ Metrics show
5. **Select Customer 2** from dropdown
   - ✅ Console shows reset logs
   - ✅ Dashboard immediately clears (empty state)
   - ✅ Findings table is empty
6. **Rapidly switch**: Customer 1 → Customer 2 → Customer 1
   - ✅ Console shows "Skipping stale customer update" for intermediate selections
   - ✅ Final customer (Customer 1) is selected
   - ✅ Dashboard is empty (no findings from previous scan)

### Known Issues Being Fixed:

1. ❌ **"9 default findings"** - This was from cached metrics. Fixed by clearing cache when tenantId is empty.
2. ❌ **Stale data showing** - Fixed by calling onReset() before setting new customer
3. ❌ **Race conditions** - Fixed by using currentCustomerRef to track latest selection

### Current Code Changes:

- Added console.log statements to trace execution flow
- Added ref tracking (currentCustomerRef) to prevent stale updates
- Clear metrics cache when tenantId is empty
- Reset findings BEFORE setting new customer (not after)
- Removed problematic sync effect that created loops
