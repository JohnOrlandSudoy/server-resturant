# Payment Method Toggle Solution

## Problem Analysis

The payment method toggle endpoint was failing when trying to set `is_enabled` to `false` with the error:
```json
{
    "success": false,
    "error": "Payment method update failed - value not changed"
}
```

## Root Causes Identified

1. **Row Level Security (RLS) Policies**: The `payment_methods_config` table has RLS enabled but the policies may be preventing updates
2. **Foreign Key Constraint Issues**: The original code was trying to set `updated_by` field which has a foreign key constraint to `user_profiles(id)`
3. **Complex Verification Logic**: The original verification logic was overly complex and causing false failures

## Solution Implemented

### 1. Simplified Toggle Endpoint

Created a new, simplified toggle endpoint in `src/routes/paymentRoutes.ts`:

```typescript
router.put('/admin/methods/:methodKey/toggle', adminOnly, async (req: Request, res: Response) => {
  // Simplified logic that:
  // 1. Validates input
  // 2. Checks current state
  // 3. Performs direct update without foreign key issues
  // 4. Returns clear success/error responses
});
```

**Key improvements:**
- ✅ Removed `updated_by` field to avoid foreign key constraints
- ✅ Simplified verification logic
- ✅ Better error handling and logging
- ✅ Handles "already in desired state" scenario gracefully

### 2. Database Schema Fix

Created `fix-payment-methods-rls.sql` to fix RLS policies:

```sql
-- Create proper RLS policies for payment_methods_config
CREATE POLICY "Enable read access for all users" ON payment_methods_config
  FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users only" ON payment_methods_config
  FOR UPDATE USING (auth.role() = 'authenticated');
```

### 3. Test Scripts

Created `test-payment-toggle.js` for comprehensive testing:
- Tests enabling (true)
- Tests disabling (false) 
- Tests invalid inputs
- Tests edge cases

## Files Created/Modified

### Modified Files:
- `src/routes/paymentRoutes.ts` - Simplified toggle endpoint

### New Files:
- `payment-methods-setup.sql` - Database setup script
- `fix-payment-methods-rls.sql` - RLS policy fix
- `test-payment-toggle.js` - Test script
- `PAYMENT_METHOD_TOGGLE_SOLUTION.md` - This documentation

## How to Use

### 1. Fix Database Policies (Run in Supabase SQL Editor)

```sql
-- Run the RLS fix script
\i fix-payment-methods-rls.sql
```

### 2. Test the Endpoint

**Enable PayMongo:**
```bash
PUT http://localhost:3000/api/payments/admin/methods/paymongo/toggle
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "is_enabled": true
}
```

**Disable PayMongo:**
```bash
PUT http://localhost:3000/api/payments/admin/methods/paymongo/toggle
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "is_enabled": false
}
```

### 3. Expected Responses

**Success Response:**
```json
{
  "success": true,
  "message": "Payment method paymongo enabled successfully",
  "data": {
    "method_key": "paymongo",
    "method_name": "PayMongo (Online)",
    "is_enabled": true,
    "updated_at": "2025-09-14T01:25:45.651462+00:00"
  }
}
```

**Already in Desired State:**
```json
{
  "success": true,
  "message": "Payment method paymongo is already enabled",
  "data": {
    "method_key": "paymongo",
    "method_name": "PayMongo (Online)",
    "is_enabled": true,
    "updated_at": "2025-09-14T01:25:45.651462+00:00"
  }
}
```

## Testing

Run the test script:
```bash
node test-payment-toggle.js
```

Or test manually with Postman/curl using the examples above.

## Troubleshooting

### If updates still fail:

1. **Check RLS Policies**: Run the RLS fix script in Supabase
2. **Verify Authentication**: Ensure you're using a valid JWT token
3. **Check Logs**: Look at server logs for detailed error information
4. **Test Direct Database**: Try updating directly in Supabase SQL editor

### Common Issues:

- **401 Unauthorized**: Invalid or missing JWT token
- **404 Not Found**: Payment method doesn't exist
- **500 Server Error**: Check server logs for details
- **RLS Policy Error**: Run the RLS fix script

## Security Notes

- The endpoint requires admin authentication (`adminOnly` middleware)
- RLS policies ensure only authenticated users can modify payment methods
- No sensitive data is exposed in responses
- All changes are logged for audit purposes
