# Admin Order Delete API Endpoints

This document describes the admin-only endpoints for deleting orders in the restaurant management system.

## Authentication
All endpoints require admin authentication. Include the admin JWT token in the Authorization header:
```
Authorization: Bearer <admin_jwt_token>
```

## Endpoints

### 1. Delete Single Order

**Endpoint:** `DELETE /api/orders/:orderId`

**Description:** Delete a single order with safety checks and validation.

**Parameters:**
- `orderId` (path): UUID of the order to delete
- `force` (query, optional): Set to `true` to force delete completed orders

**Safety Features:**
- ✅ Prevents deletion of paid orders (suggests refund instead)
- ✅ Requires force parameter for completed orders
- ✅ Validates order exists before deletion
- ✅ Logs all delete operations for audit trail

**Examples:**

```bash
# Soft delete (recommended)
DELETE /api/orders/2e2d79c8-9505-4808-837c-3f08a366d5fd

# Force delete completed order
DELETE /api/orders/2e2d79c8-9505-4808-837c-3f08a366d5fd?force=true
```

**Response:**
```json
{
  "success": true,
  "message": "Order deleted successfully",
  "data": {
    "order_id": "2e2d79c8-9505-4808-837c-3f08a366d5fd",
    "order_number": "ORD-20250908-0001",
    "deleted_at": "2025-09-08T12:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// Order not found
{
  "success": false,
  "error": "Order not found"
}

// Cannot delete paid order
{
  "success": false,
  "error": "Cannot delete order that has been paid. Consider refunding instead."
}

// Force required for completed orders
{
  "success": false,
  "error": "Cannot delete completed order without force parameter. Add ?force=true to confirm deletion."
}
```

### 2. Bulk Delete Orders

**Endpoint:** `DELETE /api/orders/bulk/delete`

**Description:** Delete multiple orders at once with comprehensive error handling.

**Request Body:**
```json
{
  "orderIds": [
    "2e2d79c8-9505-4808-837c-3f08a366d5fd",
    "3f3e80d9-a616-5919-948d-4f19b477e6ee"
  ],
  "force": false
}
```

**Parameters:**
- `orderIds` (array): Array of order UUIDs to delete (max 50)
- `force` (boolean, optional): Force delete paid/completed orders

**Safety Features:**
- ✅ Limits bulk operations to 50 orders maximum
- ✅ Individual error handling for each order
- ✅ Detailed report of successes and failures
- ✅ Skips problematic orders and continues processing

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 2 orders",
  "data": {
    "deleted_count": 2,
    "failed_count": 0,
    "failed_orders": [],
    "deleted_at": "2025-09-08T12:00:00.000Z"
  }
}
```

**Error Response with Failures:**
```json
{
  "success": true,
  "message": "Successfully deleted 1 orders",
  "data": {
    "deleted_count": 1,
    "failed_count": 1,
    "failed_orders": [
      {
        "id": "3f3e80d9-a616-5919-948d-4f19b477e6ee",
        "error": "Cannot delete paid order"
      }
    ],
    "deleted_at": "2025-09-08T12:00:00.000Z"
  }
}
```

### 3. Cancel Order (Soft Delete Alternative)

**Endpoint:** `PUT /api/orders/:orderId/cancel`

**Description:** Cancel an order instead of deleting it. This is the recommended approach for most cases.

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Parameters:**
- `orderId` (path): UUID of the order to cancel
- `reason` (body, optional): Reason for cancellation

**Safety Features:**
- ✅ Prevents cancellation of completed orders
- ✅ Prevents cancellation of paid orders (suggests refund)
- ✅ Records cancellation reason in order history
- ✅ Maintains audit trail

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "id": "2e2d79c8-9505-4808-837c-3f08a366d5fd",
    "status": "cancelled",
    "updated_at": "2025-09-08T12:00:00.000Z"
  }
}
```

## Delete Types

### Soft Delete (Default)
- Changes order status to `cancelled`
- Maintains order history and audit trail
- Recommended for most use cases
- Can be "undeleted" by changing status back

### Hard Delete (Force)
- Completely removes order from database
- Cannot be undone
- Use only when absolutely necessary
- Requires `force=true` parameter

## Best Practices

1. **Use Cancel Instead of Delete**: For most cases, use the cancel endpoint instead of delete
2. **Check Payment Status**: Always verify payment status before deletion
3. **Use Force Sparingly**: Only use force delete when absolutely necessary
4. **Bulk Operations**: Use bulk delete for efficiency when deleting multiple orders
5. **Audit Trail**: All operations are logged for compliance and debugging

## Error Handling

All endpoints include comprehensive error handling:
- ✅ Input validation
- ✅ Order existence checks
- ✅ Business rule validation
- ✅ Database error handling
- ✅ Detailed error messages

## Security

- ✅ Admin-only access (JWT token required)
- ✅ Input sanitization
- ✅ SQL injection protection
- ✅ Rate limiting (if configured)
- ✅ Audit logging

## Testing

Use these test scenarios:

1. **Valid Delete**: Delete a pending, unpaid order
2. **Paid Order**: Try to delete a paid order (should fail)
3. **Completed Order**: Try to delete completed order without force (should fail)
4. **Force Delete**: Force delete a completed order
5. **Bulk Delete**: Delete multiple orders with mixed statuses
6. **Cancel Order**: Cancel an order instead of deleting

## Integration Examples

### JavaScript/Node.js
```javascript
// Delete single order
const response = await fetch('/api/orders/2e2d79c8-9505-4808-837c-3f08a366d5fd', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});

// Bulk delete
const bulkResponse = await fetch('/api/orders/bulk/delete', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderIds: ['order1', 'order2', 'order3'],
    force: false
  })
});
```

### cURL Examples
```bash
# Delete single order
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/orders/2e2d79c8-9505-4808-837c-3f08a366d5fd"

# Bulk delete
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderIds":["order1","order2"],"force":false}' \
  "http://localhost:3000/api/orders/bulk/delete"

# Cancel order
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Customer request"}' \
  "http://localhost:3000/api/orders/2e2d79c8-9505-4808-837c-3f08a366d5fd/cancel"
```
