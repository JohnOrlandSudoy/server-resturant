# Kitchen Waste Reporting – Frontend Integration Guide

This guide walks through the client-side work needed to consume the new kitchen waste-reporting APIs from the AdminRestu server. The examples assume a React + TypeScript frontend that already uses Axios for HTTP requests and React Query (or an equivalent data layer) for caching, but you can adapt the snippets to your stack.

---

## 1. API Layer (`setup-api`)

Create a dedicated service module, e.g. `src/api/kitchenWaste.ts`, that wraps all waste-report endpoints. This keeps authentication headers and typing consistent.

```ts
// src/api/kitchenWaste.ts
import axios from './axiosInstance';

export type WasteReason =
  | 'spillage'
  | 'burn'
  | 'expiry'
  | 'quality_issue'
  | 'over_preparation'
  | 'spoilage';

export type WasteStatus = 'pending' | 'reviewed' | 'resolved';

export interface WasteReportPayload {
  ingredientId: string;
  quantity: number;
  unit?: string;
  reason: WasteReason;
  orderId?: string;
  notes?: string;
  photoUrl?: string;
}

export const createWasteReport = async (payload: WasteReportPayload) => {
  const { data } = await axios.post('/api/kitchen/waste-reports', payload);
  return data;
};

export interface WasteReportFilters {
  startDate?: string;
  endDate?: string;
  status?: WasteStatus;
  reason?: WasteReason;
  limit?: number;
  offset?: number;
}

export const getWasteReports = async (filters: WasteReportFilters = {}) => {
  const { data } = await axios.get('/api/kitchen/waste-reports', {
    params: filters
  });
  return data;
};

export const getWasteReportById = async (id: string) => {
  const { data } = await axios.get(`/api/kitchen/waste-reports/${id}`);
  return data;
};

export const updateWasteReport = async (
  id: string,
  payload: Partial<Pick<WasteReportPayload, 'notes' | 'photoUrl'>> & {
    status?: WasteStatus;
  }
) => {
  const { data } = await axios.put(`/api/kitchen/waste-reports/${id}`, payload);
  return data;
};

export interface WasteAnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

export const getWasteAnalytics = async (filters: WasteAnalyticsFilters = {}) => {
  const { data } = await axios.get('/api/kitchen/waste-reports/analytics', {
    params: filters
  });
  return data;
};
```

> **Tip:** If the frontend already has a centralized Axios instance, reuse it so the JWT bearer token, base URL, and interceptors are shared automatically.

---

## 2. UI & UX (`build-ui`)

### Screens / Components

1. **Waste Incident Form (`WasteReportForm`)**
   - Fields: ingredient selector (with search/autocomplete), quantity + unit, reason dropdown, optional order selector, notes, photo upload/url.
   - Validation: enforce positive quantity, required reason.
   - Submit handler calls `createWasteReport` and closes modal on success.

2. **Waste Queue/List (`WasteReportTable`)**
   - Displays recent incidents: created time, ingredient, quantity, status, reporter, linked order.
   - Include quick filters (status, reason, date range) wired to `getWasteReports`.
   - Row click opens detail drawer/modal.

3. **Waste Detail Drawer (`WasteReportDetail`)**
   - Shows full metadata (`kitchen_metadata`, cost impact, low-stock flags returned by API).
   - Action buttons: “Mark as Reviewed”, “Resolve” (calls `updateWasteReport` with status plus optional notes/photo).

4. **Analytics View (`WasteAnalyticsPanel`)**
   - Cards for total incidents, total cost, total quantity.
   - Charts/tables grouping by reason, ingredient. Source `getWasteAnalytics`.
   - Date range picker passes filters to the analytics API and updates display.

5. **Kitchen Dashboard Integration**
   - Add navigation entry (e.g. “Waste Reports”) in kitchen sidebar.
   - Optional summary widget showing active incidents count on the main kitchen orders screen.

### UX Considerations

- **Notifications:** Show toasts/snackbars on success or failure, with retry for transient errors.
- **Accessibility:** Ensure form controls are keyboard accessible and have proper labels.
- **Offline fallback:** Queue POST/PUT requests locally if the client already supports offline operations.

---

## 3. State & Sync (`state-sync`)

### Data Fetching Strategy

- Use React Query (or similar) for caching:
  ```ts
  // Example hook using React Query
  export const useWasteReports = (filters: WasteReportFilters) =>
    useQuery(['wasteReports', filters], () => getWasteReports(filters), {
      keepPreviousData: true,
      refetchInterval: 60_000 // optional polling
    });
  ```
- Invalidate relevant queries after creating/updating reports:
  ```ts
  const queryClient = useQueryClient();
  await createWasteReport(payload);
  queryClient.invalidateQueries(['wasteReports']);
  queryClient.invalidateQueries(['wasteAnalytics']);
  ```

### Live Updates / WebSockets

- If the kitchen dashboard already consumes Socket.IO events, emit a `waste_report_created` event from the backend (future enhancement) and subscribe on the client to push new incidents in real time.
- Otherwise, rely on refetches triggered from:
  - Tab focus (React Query’s `refetchOnWindowFocus`).
  - Manual refresh button.
  - Polling for the analytics view.

### Inventory Sync

- After a waste report is created or resolved, trigger a refresh of inventory-dependent data:
  - Re-fetch ingredient stock list (`useIngredients` query).
  - Update any low-stock banners that leverage `stock_alerts`.
  - Optionally show inline indicators in the waste list when `has_low_stock` or `has_out_of_stock` flags are true.

---

## 4. QA & Documentation (`qa-docs`)

### Manual Test Checklist (Postman or UI)

1. **Submit Waste Incident**
   - Valid payload → `201`, incident appears in list.
   - Invalid quantity (0 or negative) → UI blocks submit.
2. **List Filters**
   - Filter by status, reason, date → server returns matching records.
3. **Detail View**
   - Displays ingredient metadata, cost impact, linked order.
4. **Status Updates**
   - Mark as reviewed/resolved → status changes, timestamps populated.
   - Attempt invalid status → UI prevents request.
5. **Analytics**
   - Verify totals adjust after creating a waste report.
6. **Inventory Impact**
   - Ingredient stock level decreases by reported quantity.
   - High-waste alert surfaces when thresholds hit.

Document the test cases in your existing QA wiki (e.g. add a section to `ORDER_MANAGEMENT_TESTING_GUIDE.md`).

### User-Facing Docs

- Update the kitchen operations manual (`KITCHEN_OPERATIONS_GUIDE.md`) with:
  - Step-by-step instructions for reporting waste.
  - How to interpret analytics visuals.
  - Troubleshooting (missing ingredients, 403 errors, etc.).

---

## 5. Rollout Notes

- **Feature Flags:** Consider gating the UI behind a `WASTE_REPORTING_ENABLED` flag so you can toggle the feature per environment.
- **Training:** Include short training for kitchen staff about capturing waste reasons consistently (aligning with server-side enums).
- **Metrics:** Hook analytics into your existing dashboard to watch for unexpected spikes after launch.

Following this roadmap will get the client aligned with the new waste-reporting APIs while keeping the kitchen UI cohesive and responsive.

