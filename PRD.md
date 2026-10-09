# Product Requirements Document
## Inventory Management System — QR Code Based

**Version:** 1.0  
**Date:** 2026-06-18  
**Status:** Draft  
**Source:** Meeting notes (2026-06-18)

---

## 1. Problem Statement

A concrete products manufacturer (pipes, manholes) has no inventory management system. Mechanical and electrical components required for machinery maintenance are physically searched for in stores. When a part cannot be found, a new one is purchased — even though the part often exists, just misplaced.

**Core issue:** Parts are taken from stores by workshop teams but never returned. They remain in workshops and become "ghost stock" — physically present and in use, but invisible to the stores system. This causes:

- Inaccurate job costing (parts used aren't logged against jobs)
- Unnecessary re-purchasing of parts that already exist
- No accountability for parts consumption

---

## 2. Goal

Build a **simple, user-friendly inventory management system** using QR codes to track all parts — from individual items (e.g., bolts) to bulk boxes (e.g., welding rods) — with a mandatory daily confirmation loop to enforce team leader accountability.

---

## 3. Users & Roles

| Role | Description |
|---|---|
| **Workshop Team Leader** | Requests parts for jobs; responsible for daily confirmation of parts used/returned |
| **Stores Staff** | Issues parts against requisitions; receives returned parts back into stock |
| **Admin** | Manages inventory master data, generates QR labels, adjusts bulk quantities, sets reorder requests, and runs reports |
| **Super Admin** | Confirms/approves sensitive Admin actions (e.g., bulk quantity adjustments); system-wide oversight |

---

## 4. Key Features

### 4.1 Requisition & Issuance
- Workshop team leaders submit part requests digitally
- Stores staff review and issue parts against the requisition
- System records which parts left stores, in what quantity, and for which job/team

### 4.2 QR Code Tracking & Manual Input

QR scanning is the **primary** method for all stock movements. Manual input is accepted as a fallback for specific exceptional cases (e.g., damaged/missing label, item not yet tagged, bulk quantity adjustments).

**Individual items** (e.g., bolts, fittings):
- Each item has a unique QR code
- Scanning logs the item as issued or returned
- Manual entry allowed when a QR code cannot be scanned (reason must be noted)

**Bulk items** (e.g., welding rods, packs):
- A single QR code on the box identifies the item
- Admin enters the quantity taken out or returned manually
- **Bulk quantity adjustments require Super Admin confirmation** before taking effect
- All quantity changes are logged with timestamp, user, and reason

**QR Label Generation & Printing:**
- The system generates QR codes with cut-lines, ready for standard label printing
- Admins generate and print labels directly from the system — no external tools needed
- Labels are affixed to items or boxes by stores staff/admin during stock setup

**Manual input rules:**
- Manual entries require a logged reason (e.g., "label damaged", "emergency issue after hours")
- All manual entries are flagged in reports for audit purposes
- Only authorised roles (Stores Staff, Admin) may perform manual entries

### 4.3 Real-Time Stock Visibility
- Live dashboard showing current stock levels for all items
- No manual stock-takes required for day-to-day operations
- Stores staff and admins can see what is in stores at any moment

### 4.4 Returns Management
- Formal process for logging unused parts back into inventory
- Returns update stock levels in real time
- System differentiates between parts consumed and parts returned

### 4.5 Daily Confirmation (Accountability Loop)
- **Mandatory end-of-day step** for all workshop team leaders
- Team leaders must confirm which parts from their open requisitions were used and which were returned
- A requisition cannot be considered closed until the daily confirmation is completed
- This closes the loop and eliminates ghost stock accumulation

### 4.6 Reorder Thresholds
- Admins monitor the stock dashboard and manually set reorder request levels per item
- When stock falls to or below a threshold, the dashboard surfaces a reorder alert
- Admin initiates the reorder request within the system; handoff to Syspro for procurement

### 4.7 Reporting
- Stock level reports (current vs. minimum thresholds)
- Usage reports by team, job, and time period
- Re-purchasing reports to highlight unnecessary spend
- Job costing support — parts consumed per job
- Manual entry audit log — all non-scan movements flagged and traceable

### 4.8 Syspro Integration
- The company's finance system is **Syspro** (za.syspro.com)
- Syspro exposes an API — integration is **confirmed in scope**
- The inventory system will sync with Syspro to streamline:
  - **Job costing** — parts consumed pushed against the relevant job in Syspro
  - **Stock valuation** — real-time inventory value reflected in financials
  - **Purchase orders** — re-purchase triggers or data handed off to Syspro for procurement
- Integration will be designed so the inventory system is the source of truth for physical stock movements; Syspro remains the financial system of record

---

## 5. Platform & Scanning

The system is **browser-based only** — no native mobile app in v1.

**Scanning works in two modes:**

| Mode | How |
|---|---|
| **Mobile browser** | User opens the system on their phone; browser camera scans the QR code on the physical item or screen |
| **Desktop + webcam** | Desktop workstation with an attached camera; browser accesses the webcam to scan QR codes |

**Screen-to-screen confirmation:** Users can scan a QR code displayed on one screen using their mobile device to finalise or confirm an action (e.g., stores staff displays a requisition QR on desktop; team leader scans it on mobile to confirm receipt).

Both flows use the same browser-based QR scanner — no app install required on any device.

---

## 6. Out of Scope (v1)

- Native mobile app
- Automated procurement / purchase order generation
- Full ERP replacement
- Warehouse management beyond returns (receiving, put-away)

---

## 7. Constraints & Non-Functional Requirements

| Constraint | Detail |
|---|---|
| **Simplicity** | Must be usable by stores staff and team leaders with minimal training |
| **QR-first** | QR scanning is primary; manual input is a permitted fallback for exceptional cases only, always audited |
| **Browser-only** | No native app — QR scanning runs entirely in the browser (mobile + desktop webcam) |
| **Accountability** | Daily confirmation is non-optional; system should surface incomplete confirmations |
| **Integration** | Syspro API confirmed available — integration in scope from Sprint 3 |

---

## 8. Success Metrics

- Zero ghost stock incidents within 4 weeks of go-live
- All requisitions closed with daily confirmation within 24 hours
- Reduction in re-purchase spend (measured monthly)
- Job costing accuracy improvement (parts cost attributed correctly to jobs)

---

## 9. Proposed Timeline

| Sprint | Week | Deliverable |
|---|---|---|
| Sprint 0 | Week 1 | Requirements sign-off, stores photo audit, QR label strategy |
| Sprint 1 | Week 2 | QR code generation, basic requisition & issuance flow |
| Sprint 2 | Week 3–4 | Returns management, daily confirmation loop, manual input with audit trail |
| Sprint 3 | Week 5–6 | Reporting, admin dashboard, Syspro API integration |
| Sprint 4 | Week 7–8 | UAT, edge-case hardening, go-live |

**Total estimated delivery:** 4–8 weeks (urgent — tied to company-wide cost-savings initiative)

---

## 10. Action Items (from meeting)

| # | Action | Owner |
|---|---|---|
| 1 | ~~Research Syspro API~~ — API confirmed available, begin integration design | Dev team |
| 2 | Email stores photos to Khaya/Sappho for stores layout context | Stores contact |
| 3 | Draft proposal covering Syspro integration, QR approach, returns flow, weekly sprints | Khaya / Sappho |
| 4 | Download and email old goals/progress to Khaya | TBC |
