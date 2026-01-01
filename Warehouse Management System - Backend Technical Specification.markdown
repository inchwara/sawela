# Warehouse Management System - Backend Technical Specification

## Introduction

This document outlines the backend logic and functionalities for the Warehouse Management System (WMS), integrated as an extension of the Cherry360 ERP's Inventory module. The system will handle inventory management, transfers, requisitions, contractor interactions, breakages, repairs, and reporting. It leverages the existing ERP modules (e.g., Suppliers for vendor management, Purchases for requisitions, Orders for dispatch, HR for user access, and Reports for analytics) while ensuring independence. Modules communicate via standardized APIs and shared database references (e.g., foreign keys to user IDs from HR, supplier IDs from Suppliers).

## Feature Requirements

The following requirements are expanded from the provided specifications, providing deeper insights into functionality, user interactions, system behaviors, edge cases, and integration points. Each requirement is described in detail to ensure a comprehensive understanding for implementation.

### Inventory

 1. **Stores Management**: The system must support multiple stores as distinct entities for organizing products. Users with appropriate permissions (e.g., warehouse admins) can create, edit, or deactivate stores. Products must be assignable to specific stores upon receipt, allowing for location-based tracking. This enables granular inventory visibility, such as querying stock by store, and supports scenarios like multi-warehouse operations where products are segregated by department or physical location.

 2. **Product Identification by Store**: Every product record must include a mandatory association with one or more stores, facilitating queries and reports filtered by location. This ensures traceability, prevents cross-store mismatches, and integrates with the Reports module for store-specific analytics.

 3. **Customizable Categories and Subcategories**: Building on the existing `product_categories` table in the Inventory module, users should be able to create, update, or delete categories and nested subcategories via an admin interface. Categories must be hierarchical (e.g., Electronics &gt; Laptops &gt; Gaming), with validation to prevent cycles. This allows dynamic classification tailored to business needs, such as adding seasonal or supplier-specific groupings.

 4. **Receiving Products from Suppliers and Contractors**: The system acts as the central receiver for products sourced from various suppliers (linked to the Suppliers module) or contractors (treated as special users in HR module). Receipt processes must validate supplier/contractor details, update stock automatically, and handle partial deliveries. Edge cases include rejecting duplicates or integrating with Purchases for order fulfillment.

 5. **Contractor Order Handling**: Contractors can initiate orders externally (off-system), but the warehouse team handles receipt. The system should flag contractor-related receipts for immediate dispatch if applicable, with options to link to specific projects or tasks. This ensures accountability, as contractors may not have direct system access, requiring warehouse oversight.

 6. **Document Accompaniment for Receipts**: Every product receipt must require attachment or input of a supporting document (e.g., receipt, invoice, delivery note, or custom notification note), including a unique reference number for auditing. The system validates document uniqueness and stores files in Supabase storage, linking them to receipt records. This supports compliance, dispute resolution, and integration with Finance for invoicing.

 7. **Departmental Ordering and Receipt**: Departments (managed via HR module) can place internal orders, but all physical receipts are managed by the warehouse team. This involves workflow approvals, stock allocation to departments post-receipt, and notifications to requesting departments upon availability.

 8. **Category Classification on Receipt**: Upon receiving products, the system mandates assigning them to existing categories/subcategories from the Inventory module. Auto-suggestions based on product name or supplier history can enhance usability, ensuring consistent organization and easing search/reporting.

 9. **Unique Product Codes**: Each product must have a system-generated or user-provided unique code (e.g., alphanumeric sequence like PROD-001), enforced at the database level to prevent duplicates. Codes should be searchable and integrable with barcoding/QR systems for scanning efficiency.

10. **Optional Unit Pricing**: Products can include an optional unit price field for cost tracking, which, if set, integrates with the Finance module for valuation reports. This allows for variable pricing based on suppliers or batches, with historical price logging for trend analysis.

11. **Expiry Date Management and Notifications**: Products with a perishable or time-sensitive nature must support expiry dates. The system automatically schedules notifications (e.g., via email) at 7 days and 2 days before expiry, targeting warehouse teams and relevant stakeholders. Cron jobs scan for near-expiries daily, with options for custom thresholds. Edge cases include bulk updates for batch expiries and integration with Reports for expiry forecasts.

### Transfers/Dispatch

1. **Inter-Entity Transfers**: Products can be transferred from the primary warehouse to other companies, departments, or external entities. The system tracks transfer history, including quantities, dates, and reasons, with support for bulk transfers (e.g., multiple products in one transaction).

2. **Container-Based Multi-Destination Handling**: A single incoming container may contain products destined for multiple locations. The system allows splitting receipts into sub-transfers upon arrival, automating distribution based on predefined rules or manual assignment, ensuring efficient unpacking and routing.

3. **Internal vs. External Transfers**: Internal transfers (within the company) are for departmental use and require minimal approvals, while external ones (to outside entities) involve additional documentation and tracking via the Orders module. Both types deduct from the source stock and add to the destination if internal.

4. **Loanable Products with Return Timelines**: Certain products can be designated as loans, with mandatory return dates. The system enforces timelines, prevents loans beyond available stock, and handles extensions via approvals. This is useful for tools or equipment shared across teams.

5. **Return Notification System**: Automated alerts for loaned product returns must notify both the warehouse team and the custodian (user/department) at configurable intervals (e.g., 7/2 days before due). Notifications include details like product code, location, and overdue penalties if integrated with Finance.

6. **Departmental Transfers with Acknowledgement**: Transfers to departments require acknowledgement by the Head of Department (HOD, from HR module), digitally signed in the system. This closes the transfer loop, updates stock visibility, and logs for audits.

7. **Configurable Return Options for External Transfers**: For external transfers, users can specify per-product if return is expected, with fields for notes (e.g., conditions, serial numbers). Non-returnable transfers are treated as sales/donations, linking to Orders or Finance modules accordingly.

### Purchase Requisition

1. **Access-Managed Requisition Raising**: Users authenticate via HR module roles to raise requisitions, with tiered access levels (e.g., view-only for juniors, full create/edit for managers). The system logs all actions for traceability.

2. **Multi-Level Approvals**: Requisitions undergo sequential approvals (configurable, e.g., HOD → Finance → Warehouse). Approved requisitions notify the warehouse for dispatch, currently focused on internal sources but extensible to external purchases via the Purchases module.

3. **Stock Visibility Pre-Submission**: Before submitting a requisition, users must view real-time stock levels (queried from Inventory) to prevent requests for unavailable products. If stock is low, suggest alternatives or partial fulfillment.

4. **Post-Dispatch Acknowledgement**: After dispatch, the requester receives a system prompt to acknowledge receipt, updating status and stock allocation. Non-acknowledgement triggers reminders, ensuring chain of custody.

5. **Variant Selection**: When adding products to requisitions, users select from available variants (stored as JSON in product records), such as color, size, or specifications. This ensures precision, with validation against current stock per variant.

### Contractors

1. **Off-System Order Placement**: Contractors submit orders externally, but the system captures receipts by warehouse team, linking to contractor profiles in HR/Suppliers modules for verification.

2. **Immediate Dispatch Post-Receipt**: Contractor-sourced products are often task-specific (e.g., construction materials) and must be dispatched immediately upon receipt, automating transfer creation to avoid storage delays.

3. **Printable Signed Assignment Documents**: The system generates PDF forms listing assigned products, requiring digital or scanned signatures from contractors/recipients. Stored signatures link to records for legal proof, integrating with Reports for compliance checks.

### Breakages

1. **Breakage Reporting for Operational Products**: Users report breakages for products in use, detailing causes (e.g., wear-and-tear, accidents). The system flags affected stock as unusable, adjusting quantities and notifying managers.

2. **Replacement Requests as Internal Transfers**: Managers can request replacements, treated as approved internal transfers. Approvals involve checks against stock availability, with options for partial replacements or alternatives.

### Repairs

1. **HOD-Initiated Repair Reporting**: Only Heads of Departments can report and request repairs, providing details like fault description and urgency.

2. **Repairability Tracking**: Products are marked as repairable/non-repairable based on category or manual input, influencing workflow (e.g., non-repairable routes to breakages).

3. **Unique Identifiers for Repair Items**: Assign serial numbers or custom IDs to track individual products in repair, preventing mix-ups in batches.

4. **Repair Status Tracking**: Monitor if a product has been repaired, with timestamps and notes. Completed repairs return products to active stock; failures escalate to breakages.

### Reports

1. **Monthly Inventory Reports**: Generate summaries of stock levels, values, and movements on a monthly basis, customizable by store/category. Includes trends like stock turnover.

2. **Discrepancies and Variants Analysis**: Highlight mismatches between expected and actual stock (e.g., from audits), including variant-specific discrepancies for accurate reconciliation.

3. **Expiries, Damages, and Breakages Tracking**: Report on upcoming expiries, recorded damages/breakages, with filters by date/range. Supports predictive alerts for high-risk products.

4. **Fast and Slow-Moving Products**: Analyze product velocity based on receipt/transfer frequency, categorizing as fast/slow-moving to inform purchasing decisions. Integrates with Purchases for reorder suggestions.

## Workflows and Process Flows

This section provides detailed workflows in tabular format for each major functional area. Each workflow outlines steps, actors, actions, and integration/notes, ensuring clear process flows integrated with Cherry360 modules.

### Workflow 1: Product Receiving (Inventory Module)

| Step | Actor | Action | Integration/Notes |
| --- | --- | --- | --- |
| 1 | Supplier/Contractor | Delivers products with a document (receipt/invoice/delivery note) and reference number. | Offline for contractors; system generates a printable form for signing. |
| 2 | Warehouse Team | Scans/uploads document, enters product details (code, category, variant, expiry, unit price optional). Assigns to store/cost center. | The inventory module updates stock levels. Validates unique code. |
| 3 | System | Classifies product, checks for expiry setup, and notifies if immediate issues. | Triggers notifications if expiry is near. Links to the Suppliers module for the vendor record. |
| 4 | Warehouse Team | Confirms receipt; stock visible to all users. | Audit log. |

### Workflow 2: Product Transfer/Dispatch (Inventory Module)

| Step | Actor | Action | Integration/Notes |
| --- | --- | --- | --- |
| 1 | Warehouse Team | Initiates transfer request, selecting products, quantities, from/to stores/entities, type (internal/external), and loan details if applicable. | Checks real-time stock availability from Inventory; prevents over-transfer. |
| 2 | System | Validates transfer details, deducts from source stock, and creates transfer record. For loans, sets return timeline and schedules notifications. | Integrates with Orders module for external tracking; uses HR for user assignments. |
| 3 | Recipient (HOD/User) | Acknowledges receipt digitally, with notes if needed. For external, specifies return option per product. | Notifications sent to both parties; batch handling for multi-destination containers. |
| 4 | System | Updates stock at destination (if internal), closes transfer upon acknowledgement. Handles returns by adding back to stock if loaned. | Audit log: links to Reports for movement analysis. |

### Workflow 3: Purchase Requisition (Purchases Module Integration)

| Step | Actor | Action | Integration/Notes |
| --- | --- | --- | --- |
| 1 | User/Requester | Logs in via access management, views current stock, raises requisitions, selects products, variants, and quantities. | Visibility from the Inventory module prevents out-of-stock submissions. |
| 2 | Approvers (HOD/Manager) | Reviews and approves/rejects at multiple levels, with comments. | Notifications to next approver; configurable workflows via Purchases module. |
| 3 | System | On final approval, it notifies the warehouse team and creates a dispatch task. | Triggers transfer creation in Inventory; status updates in real-time. |
| 4 | Warehouse Team | Dispatches products, updating stock. | Integrates with Orders if external sourcing is needed. |
| 5 | Requester | Acknowledges receipt through the system. | Closes requisition; audit log in Supabase. |

### Workflow 4: Contractor Product Handling (Suppliers/Inventory Modules)

| Step | Actor | Action | Integration/Notes |
| --- | --- | --- | --- |
| 1 | Contractor | Places order off-system, delivers products with reference. | Linked to contractor profile in HR/Suppliers; offline initiation. |
| 2 | Warehouse Team | Receives products as per standard receipt, flags for immediate dispatch. | Updates Inventory stock temporarily; auto-creates external transfer. |
| 3 | System | Generates printable PDF of assigned products for signing. | Stores signed document in Supabase; notifies contractor/user. |
| 4 | Contractor/Recipient | Signs and returns document (scanned/uploaded). | Confirms dispatch; integrates with Reports for task-specific tracking. |

### Workflow 5: Breakage Reporting and Replacement (Inventory Module)

| Step | Actor | Action | Integration/Notes |
| --- | --- | --- | --- |
| 1 | User/Manager | Reports breakage details (product, quantity, cause), and requests replacement if needed. | Flags the product as unusable in Inventory; notifies the warehouse. |
| 2 | Approver (HOD) | Reviews and approves/rejects the replacement request. | Treated as an internal transfer if approved; checks stock availability. |
| 3 | System | Creates replacement transfer, deducts broken stock. | Links to Reports for damage analysis; audit log in Supabase. |
| 4 | Warehouse Team | Dispatches replacement, confirms completion. | Updates stock levels; notifications to the reporter. |

### Workflow 6: Repair Reporting and Tracking (Inventory Module)

| Step | Actor | Action | Integration/Notes |
| --- | --- | --- | --- |
| 1 | HOD | Reports repair need, assigns unique identifier, describes issue, marks as repairable/non-repairable. | Holds product stock during process; notifies repair team. |
| 2 | Repair Team | Performs repair, updates status (repaired/not). | If not repairable, auto-escalates to breakage workflow. |
| 3 | System | Tracks status changes, returns product to active stock if repaired. | Cron jobs for overdue repairs; integrates with Reports for maintenance logs. |
| 4 | HOD | Confirms resolution, closes report. | Audit log in Supabase; notifications throughout. |

### Workflow 7: Report Generation (Reports Module)

| Step | Actor | Action | Integration/Notes |
| --- | --- | --- | --- |
| 1 | User/Admin | Selects report type (e.g., monthly inventory, discrepancies, expiries, movement). Specifies filters (date, store, category). | Pulls data from Inventory/Supabase via APIs. |
| 2 | System | Aggregates data (e.g., SQL queries for sums, averages), generates report in PDF/CSV format. | Handles fast/slow-moving calculations based on historical transfers/receipts. |
| 3 | User | Views/downloads report, with options for scheduling (e.g., monthly emails). | Integrates with Finance for valuations; audit access controls via HR. |
| 4 | System | Logs report generation for compliance. | Stores in Supabase; notifications for anomalies (e.g., high discrepancies). |

## Database Schema

Define the following  tables (PostgreSQL schema). Use UUIDs for primary keys. Establish relationships for easy inter-module communication (e.g., link to the Suppliers table).

### Core Tables

1. **stores (Cost centers/stores)**

   - id: UUID (PK)
   - name: string
   - description: text (optional)
   - location: string (optional)
   - created_at, updated_at: timestamps

2. **products (Inventory products; extend existing Inventory module if applicable)**

   - code: string (unique, auto-generated e.g., via sequence)
   - name: string
   - expiry_date: date (optional)
   - is_repairable: boolean (default: false)

3. **product_receipts (Receiving products)**

   - id: UUID (PK)
   - product_id: UUID (FK to products)
   - supplier_id: UUID (FK to suppliers table in the Suppliers module, nullable for internal)
   - contractor_id: UUID (FK to users in HR module, if contractor)
   - quantity: integer
   - document_type: enum ('receipt', 'invoice', 'delivery_note', 'notification_note')
   - reference_number: string
   - received_by: UUID (FK to users in HR module)
   - store_id: UUID (FK to stores)
   - created_at, updated_at: timestamps

4. **transfers (Transfers/Dispatches)**

   - id: UUID (PK)
   - product_id: UUID (FK to products)
   - from_store_id: UUID (FK to stores)
   - to_entity: string (department name or external entity)
   - to_user_id: UUID (FK to users in HR module, e.g., HOD)
   - quantity: integer
   - type: enum ('internal', 'external')
   - is_loan: boolean (default: false)
   - return_date: date (if loan)
   - is_returned: boolean (default: false)
   - notes: text (optional)
   - acknowledged_by: UUID (FK to users, nullable until acknowledged)
   - created_at, updated_at: timestamps

5. **purchase_requisitions (Requisitions)**

   - id: UUID (PK)
   - requester_id: UUID (FK to users in HR module)
   - product_id: UUID (FK to products)
   - variant: jsonb (selected variant, e.g., {"color": "red"})
   - quantity: integer
   - status: enum ('pending', 'approved', 'dispatched', 'acknowledged', 'rejected')
   - approver_id: UUID (FK to users, nullable)
   - notes: text (optional)
   - created_at, updated_at: timestamps
   - Integrates with Purchases module: Trigger API call to update purchase status.

6. **breakages (Breakages/Damages)**

   - id: UUID (PK)
   - product_id: UUID (FK to products)
   - quantity: integer
   - reported_by: UUID (FK to users)
   - replacement_requested: boolean (default: false)
   - approved: boolean (nullable)
   - notes: text
   - created_at, updated_at: timestamps
   - Link to transfers for replacement as an internal transfer.

7. **repairs (Repairs)**

   - id: UUID (PK)
   - product_id: UUID (FK to products)
   - unique_identifier: string (e.g., serial number)
   - reported_by: UUID (FK to users, e.g., HOD)
   - is_repairable: boolean
   - repaired: boolean (default: false)
   - notes: text
   - created_at, updated_at: timestamps

### Relationships

- One-to-Many: stores → inventory_stocks
- Many-to-One: products → product_categories (existing)
- One-to-Many: products → inventory_stocks, product_receipts, transfers, breakages, repairs
- Foreign keys ensure integration: e.g., user_ids link to HR, supplier_ids to Suppliers.

Use triggers in Supabase for stock updates (e.g., on receipt/transfer, increment/decrement quantity in `inventory_stocks`).

## API Endpoints

All endpoints under `/api/wms/` namespace. Use Laravel routes with authentication (JWT/Sanctum). Return JSON responses with HTTP status codes.

### Inventory Management

- GET /api/wms/stores: List stores (paginated).
- POST /api/wms/stores: Create store (admin only).
- POST /api/wms/products: Create product (generate unique code, optional expiry; link to existing categories).
- GET /api/wms/products/{id}/stock: Get stock levels per store, check availability.
- POST /api/wms/receipts: Receive products (update stock, link document). Logic: Validate `reference_number` uniqueness; if `expiry_date` set, schedule notifications.
- Integration: On receipt from the supplier, call the Purchases module API to close order.

### Transfers/Dispatch

- POST /api/wms/transfers: Create transfer (internal/external, loan option). Logic: Deduct from `from_store_id` stock; if loan, queue notification for `return_date` -7/-2 days.
- PATCH /api/wms/transfers/{id}/acknowledge: Acknowledge receipt (update `acknowledged_by`).
- GET /api/wms/transfers/overdue: List overdue loans (for notifications).
- Integration: For external, link to Orders module for dispatch tracking.

### Purchase Requisitions

- POST /api/wms/requisitions: Raise requisition (check stock visibility first). Logic: If stock &lt; quantity, reject; else, set pending.
- PATCH /api/wms/requisitions/{id}/approve: Approve (warehouse manager role). Logic: Trigger dispatch (create transfer).
- PATCH /api/wms/requisitions/{id}/acknowledge: Requester acknowledges.
- Integration: Sync with the Purchases module for approval workflows.

### Contractors

- POST /api/wms/contractor-receipts: Receive contractor products (immediate dispatch). Logic: Create receipt, then auto-create transfer (external); generate printable PDF for signature (use Laravel PDF library).
- Integration: Contractor `user_id` from HR; products from Suppliers.

### Breakages

- POST /api/wms/breakages: Report breakage. Logic: If `replacement_requested`, create an internal requisition for approval.
- PATCH /api/wms/breakages/{id}/approve: Approve replacement (trigger transfer).

### Repairs

- POST /api/wms/repairs: Report repair (HOD role). Logic: Set `unique_identifier`; update product `is_repairable`.
- PATCH /api/wms/repairs/{id}/update: Mark as repaired/not.
- Integration: Link to Inventory for stock adjustments if unrepairable (treat as breakage).

### Reports

- GET /api/wms/reports/inventory: Monthly inventory summary (use SQL aggregates on `inventory_stocks`).
- GET /api/wms/reports/discrepancies: Variants/discrepancies (compare receipts vs. stocks).
- GET /api/wms/reports/expiries: Expiries/damages/breakages (filter by date).
- GET /api/wms/reports/movement: Fast/slow moving products (based on transfer/receipt frequency over time).
- Integration: Expose data to the Reports module via API for dashboards.

## Business Logic

### Notifications

- Use Laravel queues: On product creation with expiry, schedule jobs for -7/-2 days warnings (notify warehouse team via email).
- For loans: Schedule return reminders (notify custodian and warehouse).
- Approvals: Notify approvers on requisition creation.

### Workflows (Detailed Logic)

- **Receiving Products**: Validate document; update stock; classify by category. For contractors: Auto-dispatch logic (create transfer immediately).
- **Transfers**: Check stock availability; for containers with multiple destinations, use batch transfers (array of `to_entities` in POST).
- **Requisitions**: Pre-check stock; multi-level approvals (configurable via settings table). On dispatch, deduct stock; require acknowledgement to close.
- **Breakages/Repairs**: Report → Approve → Transfer/Replacement. Track history via audit logs.
- **Expiries**: Cron job daily to scan `products` table and notify.

### Error Handling & Validation

- Use Laravel validators: e.g., quantity &gt; 0, unique codes.
- Soft deletes for audit.
- Transactional operations: Wrap stock updates in DB transactions to prevent inconsistencies.

### Security & Performance

- Role checks: Warehouse Manager for receipts/dispatches; HOD for requisitions/repairs.
- Caching: Use Redis for stock queries.
- Scalability: Index frequently queried fields (e.g., `product_code`, `expiry_date`).