# Accounting System - Development Roadmap
**Date:** January 20, 2026  
**Planning Horizon:** 6 Months  
**Status:** Active Development

---

## Executive Summary

This roadmap outlines the strategic development plan for the accounting system over the next 6 months. The system has successfully completed Phase 2 (Auto-Posting & Ryczalt) and is ready to move into Phase 3 (UI/UX Refinement) and beyond.

**Current State:** ✅ Auto-posting functional, ryczalt accounts working  
**Next Milestone:** Enhanced UI/UX and expense management  
**Long-term Goal:** Complete accounting solution for JDG and Spółka entities

---

## Phase 3: UI/UX Refinement & Polish
**Timeline:** Weeks 1-2 (Jan 20 - Feb 2, 2026)  
**Focus:** User experience improvements and visual design  
**Priority:** HIGH

### Week 1: Dashboard & Navigation

#### **Day 1-2: Dashboard Enhancements**
- [ ] Create unaccounted invoices panel
  - Query for unposted invoices in current period
  - Display count and total amount
  - Add "Assign Accounts" button
  - Color-code by urgency (> 7 days = red)

- [ ] Add tax deadline widget
  - Calculate next ryczalt payment date (20th of next month)
  - Show amount due
  - Add "Mark as Paid" functionality
  - Show VAT declaration deadline (25th)

- [ ] Implement quick actions section
  - Auto-księguj button
  - Add invoice button
  - View reports button
  - Manage accounts button
  - Export JPK button

#### **Day 3-4: Period Navigation**
- [ ] Add month selector to ryczalt screen
  - Visual month picker
  - Arrow navigation (prev/next)
  - Current period highlight
  - Period status indicator (Open/Closed/Locked)

- [ ] Create period summary card
  - Total revenue for period
  - Total tax due
  - Posted vs unaccounted count
  - Period closing date

#### **Day 5: Recent Activity Feed**
- [ ] Create activity logging system
  - Log invoice posting events
  - Log account assignments
  - Log period creation
  - Log user actions

- [ ] Display recent activity
  - Last 10 activities
  - Timestamp (relative: "2 min ago")
  - User attribution
  - Action type icons

### Week 2: Enhanced Lists & Details

#### **Day 1-2: All Period Invoices List**
- [ ] Create comprehensive invoice list
  - Show ALL invoices for selected period
  - Posted invoices (green checkmark)
  - Unaccounted invoices (orange warning)
  - Display assigned account or "Not assigned"
  - Click to view detail

- [ ] Add filtering capabilities
  - Filter by status (posted/unposted)
  - Filter by account
  - Filter by amount range
  - Filter by customer

#### **Day 3-4: Invoice Detail Enhancements**
- [ ] Add accounting status section
  - Current status badge
  - Assigned account display
  - Posted date and user
  - Period information
  - Register entry link

- [ ] Create posting history timeline
  - All status changes
  - Account assignments
  - User actions
  - Timestamps

- [ ] Add quick actions bar
  - Auto-post button
  - Assign account button
  - Mark as paid button
  - More actions dropdown

#### **Day 5: Visual Polish**
- [ ] Implement color system
  - Status colors (posted, unposted, error)
  - Account type colors
  - Priority colors

- [ ] Add loading states
  - Skeleton screens
  - Progress indicators
  - Optimistic UI updates

- [ ] Improve typography
  - Consistent heading hierarchy
  - Readable body text
  - Proper spacing

**Deliverables:**
- ✅ Enhanced dashboard with panels
- ✅ Improved navigation and period selection
- ✅ Comprehensive invoice lists
- ✅ Detailed invoice view
- ✅ Visual design system

**Success Metrics:**
- User can find unaccounted invoices in < 10 seconds
- Period navigation is intuitive (< 2 clicks)
- Invoice detail shows all relevant info
- Visual consistency across screens

---

## Phase 4: Expense Management
**Timeline:** Weeks 3-4 (Feb 3 - Feb 16, 2026)  
**Focus:** Complete income/expense cycle  
**Priority:** HIGH

### Week 3: Expense Posting Foundation

#### **Day 1-2: Expense Account System**
- [ ] Design expense account structure
  - Similar to ryczalt accounts but for expenses
  - Categories: office, travel, equipment, services, etc.
  - Cost centers (optional)
  - VAT deduction tracking

- [ ] Create expense account management UI
  - List expense accounts
  - Add/edit/delete accounts
  - Assign categories
  - Set VAT deduction rules

#### **Day 3-4: Expense Posting Logic**
- [ ] Implement expense posting function
  ```sql
  CREATE FUNCTION post_expense_to_register(
    p_invoice_id UUID
  ) RETURNS JSONB
  ```
  - Validate expense invoice
  - Check VAT deduction eligibility
  - Create expense register entry
  - Update invoice status

- [ ] Add expense account assignment
  - Extend RyczaltAccountAssignmentModal for expenses
  - Show expense accounts
  - Validate assignments

#### **Day 5: Expense Register**
- [ ] Create expense register table
  ```sql
  CREATE TABLE jdg_expense_register_lines (
    id UUID PRIMARY KEY,
    business_profile_id UUID,
    invoice_id UUID,
    occurred_at DATE,
    period_year INTEGER,
    period_month INTEGER,
    expense_amount DECIMAL(15,2),
    vat_deductible DECIMAL(15,2),
    expense_category TEXT,
    ...
  )
  ```

- [ ] Build expense register view
  - List all expense entries
  - Filter by period
  - Filter by category
  - Show VAT deduction

### Week 4: Expense UI & Integration

#### **Day 1-2: Expense Screens**
- [ ] Create expense accounts screen
  - Similar to ryczalt accounts
  - Show expense categories
  - Display totals
  - List posted expenses

- [ ] Add expense dashboard widgets
  - Total expenses for period
  - Top expense categories
  - VAT deduction summary

#### **Day 3-4: Auto-Post Integration**
- [ ] Extend auto-post for expenses
  - Detect expense invoices
  - Route to expense posting
  - Handle missing expense accounts
  - Show in assignment modal

- [ ] Add expense validation
  - Check VAT rates
  - Validate amounts
  - Verify categories

#### **Day 5: Testing & Polish**
- [ ] Test expense posting workflow
- [ ] Verify VAT calculations
- [ ] Check period totals
- [ ] User acceptance testing

**Deliverables:**
- ✅ Expense account management
- ✅ Expense posting functionality
- ✅ Expense register
- ✅ Integrated with auto-post
- ✅ VAT deduction tracking

**Success Metrics:**
- Expenses post as easily as income
- VAT deduction calculated correctly
- Expense categories clear and useful
- Period totals include expenses

---

## Phase 5: Reporting & Analytics
**Timeline:** Weeks 5-8 (Feb 17 - Mar 15, 2026)  
**Focus:** Business insights and tax compliance  
**Priority:** MEDIUM-HIGH

### Week 5: Basic Reports

#### **Report Templates**
- [ ] Profit & Loss Statement
  - Revenue by account
  - Expenses by category
  - Net profit/loss
  - Period comparison

- [ ] Revenue Summary
  - Total revenue
  - Revenue by account
  - Tax calculations
  - Payment status

- [ ] Expense Summary
  - Total expenses
  - Expenses by category
  - VAT deduction
  - Cost analysis

#### **Export Functionality**
- [ ] PDF export
- [ ] Excel export
- [ ] CSV export
- [ ] Print-friendly format

### Week 6: Tax Reports

#### **Ryczalt Tax Report**
- [ ] Monthly ryczalt summary
  - Revenue by account
  - Tax rate per account
  - Total tax due
  - Payment deadline

- [ ] Annual ryczalt summary
  - Yearly totals
  - Account breakdown
  - Tax paid
  - Outstanding amounts

#### **VAT Reports (Future)**
- [ ] VAT summary
- [ ] JPK_VAT preparation
- [ ] VAT deduction report

### Week 7-8: Analytics Dashboard

#### **Visual Analytics**
- [ ] Revenue trends chart
  - Monthly revenue over time
  - Account breakdown
  - Growth rate

- [ ] Expense analysis chart
  - Category breakdown
  - Trends over time
  - Cost optimization insights

- [ ] Profitability metrics
  - Profit margin
  - Revenue per account
  - Expense ratio

#### **Period Comparisons**
- [ ] Month-over-month comparison
- [ ] Year-over-year comparison
- [ ] Budget vs actual (future)

**Deliverables:**
- ✅ Standard financial reports
- ✅ Tax compliance reports
- ✅ Visual analytics dashboard
- ✅ Export functionality
- ✅ Period comparisons

**Success Metrics:**
- Reports generate in < 5 seconds
- All required tax data available
- Charts are clear and actionable
- Export formats work correctly

---

## Phase 6: Advanced Features
**Timeline:** Weeks 9-12 (Mar 16 - Apr 12, 2026)  
**Focus:** Automation and intelligence  
**Priority:** MEDIUM

### Week 9: Period Management

#### **Period Lifecycle**
- [ ] Period creation UI
  - Create new periods
  - Set period boundaries
  - Define fiscal year

- [ ] Period closing workflow
  - Validate all invoices posted
  - Calculate period totals
  - Generate closing reports
  - Lock period

- [ ] Period locking
  - Prevent posting to closed periods
  - Require special permission to reopen
  - Audit trail for reopening

#### **Period Validation**
- [ ] Check for unposted invoices
- [ ] Verify tax calculations
- [ ] Validate account balances
- [ ] Generate warnings

### Week 10: Manual Posting

#### **Journal Entry Interface**
- [ ] Manual entry form
  - Date picker
  - Account selector
  - Debit/credit fields
  - Description
  - Attachments

- [ ] Multi-line entries
  - Add/remove lines
  - Auto-balance validation
  - Split transactions

- [ ] Posting templates
  - Save common entries
  - Quick apply
  - Customize per use

#### **Validation & Review**
- [ ] Balance validation (debits = credits)
- [ ] Account validation
- [ ] Amount validation
- [ ] Review before posting

### Week 11: Smart Categorization

#### **AI-Powered Suggestions**
- [ ] Analyze invoice content
  - Extract key information
  - Identify patterns
  - Suggest accounts

- [ ] Learn from history
  - Track user corrections
  - Improve suggestions
  - Confidence scoring

#### **Automatic Categorization**
- [ ] PKD code matching
  - Match invoice to PKD codes
  - Suggest appropriate account
  - Auto-assign if confident

- [ ] Contract-based categorization
  - Link invoices to contracts
  - Use contract account
  - Validate amounts

### Week 12: Workflow Automation

#### **Automatic Posting Rules**
- [ ] Define posting rules
  - If customer = X, then account = Y
  - If amount > Z, require approval
  - If category = A, use account B

- [ ] Rule engine
  - Evaluate rules on invoice creation
  - Apply automatic assignments
  - Log rule applications

#### **Scheduled Operations**
- [ ] Scheduled batch posting
  - Daily auto-post at specific time
  - Weekly period closing
  - Monthly report generation

- [ ] Email notifications
  - Posting summary
  - Error alerts
  - Tax deadline reminders

**Deliverables:**
- ✅ Period management system
- ✅ Manual posting interface
- ✅ Smart categorization
- ✅ Workflow automation
- ✅ Scheduled operations

**Success Metrics:**
- 90% of invoices auto-categorized correctly
- Period closing takes < 10 minutes
- Manual posting is intuitive
- Automation reduces manual work by 50%

---

## Phase 7: Spółka (Company) Accounting
**Timeline:** Weeks 13-20 (Apr 13 - Jun 7, 2026)  
**Focus:** Full double-entry bookkeeping  
**Priority:** MEDIUM

### Weeks 13-14: Chart of Accounts

#### **Account Structure**
- [ ] Design chart of accounts
  - Assets (1xxx)
  - Liabilities (2xxx)
  - Equity (3xxx)
  - Revenue (4xxx)
  - Expenses (5xxx)

- [ ] Account management
  - Create/edit/delete accounts
  - Account hierarchy
  - Account types
  - Active/inactive status

#### **Account Configuration**
- [ ] Account properties
  - Account number
  - Account name
  - Account type
  - Parent account
  - VAT settings

### Weeks 15-16: Double-Entry System

#### **Journal Entries**
- [ ] Journal entry creation
  - Multiple lines
  - Debit/credit validation
  - Auto-balance
  - Posting date

- [ ] Journal entry types
  - General journal
  - Sales journal
  - Purchase journal
  - Cash journal

#### **Posting Logic**
- [ ] Post to general ledger
  - Create ledger entries
  - Update account balances
  - Maintain audit trail

- [ ] Posting validation
  - Balance check
  - Account validation
  - Period validation
  - Amount validation

### Weeks 17-18: Financial Statements

#### **Balance Sheet**
- [ ] Assets section
  - Current assets
  - Fixed assets
  - Total assets

- [ ] Liabilities & Equity section
  - Current liabilities
  - Long-term liabilities
  - Equity
  - Total liabilities & equity

#### **Profit & Loss**
- [ ] Revenue section
  - Sales revenue
  - Other income
  - Total revenue

- [ ] Expenses section
  - Cost of goods sold
  - Operating expenses
  - Other expenses
  - Total expenses

- [ ] Net profit/loss calculation

### Weeks 19-20: Tax Calculations

#### **CIT (Corporate Income Tax)**
- [ ] Calculate taxable income
  - Accounting profit
  - Tax adjustments
  - Taxable base

- [ ] Calculate CIT liability
  - Apply tax rate (9% or 19%)
  - Quarterly payments
  - Annual settlement

#### **VAT Accounting**
- [ ] VAT on sales
- [ ] VAT on purchases
- [ ] VAT payable/receivable
- [ ] JPK_VAT generation

**Deliverables:**
- ✅ Chart of accounts system
- ✅ Double-entry bookkeeping
- ✅ Financial statements
- ✅ Tax calculations (CIT, VAT)
- ✅ Spółka posting workflow

**Success Metrics:**
- Balance sheet balances correctly
- P&L shows accurate profit/loss
- CIT calculated correctly
- VAT reconciles properly

---

## Phase 8: Integrations & External Systems
**Timeline:** Weeks 21-24 (Jun 8 - Jul 5, 2026)  
**Focus:** Connect with external services  
**Priority:** LOW-MEDIUM

### Week 21: Bank Integration

#### **Bank Connection**
- [ ] Connect to bank API
  - OAuth authentication
  - Account selection
  - Transaction sync

- [ ] Transaction import
  - Fetch transactions
  - Match to invoices
  - Auto-reconciliation

#### **Payment Matching**
- [ ] Match payments to invoices
  - By amount
  - By reference number
  - By customer

- [ ] Mark invoices as paid
  - Update payment status
  - Record payment date
  - Update balances

### Week 22: KSeF Integration

#### **E-Invoice System**
- [ ] Connect to KSeF API
  - Authentication
  - Invoice submission
  - Status checking

- [ ] Send invoices to KSeF
  - Format conversion
  - Validation
  - Submission
  - Confirmation

#### **Receive from KSeF**
- [ ] Fetch received invoices
  - Download from KSeF
  - Parse XML
  - Create invoice records

### Week 23: Payment Gateway

#### **Online Payments**
- [ ] Stripe integration
  - Payment links
  - Checkout sessions
  - Webhook handling

- [ ] Przelewy24 integration
  - Payment initiation
  - Status tracking
  - Confirmation

#### **Payment Tracking**
- [ ] Payment status updates
  - Pending
  - Succeeded
  - Failed
  - Refunded

### Week 24: Export Integrations

#### **Accounting Software Export**
- [ ] Export to popular formats
  - Symfonia
  - Optima
  - Comarch ERP
  - Generic CSV

- [ ] Data mapping
  - Account mapping
  - Transaction mapping
  - Customer mapping

**Deliverables:**
- ✅ Bank account integration
- ✅ KSeF e-invoice integration
- ✅ Payment gateway integration
- ✅ Accounting software export
- ✅ Automated reconciliation

**Success Metrics:**
- Bank transactions sync automatically
- KSeF invoices submit successfully
- Payments match correctly
- Export formats work with target systems

---

## Technical Debt & Maintenance

### Ongoing Tasks (Throughout All Phases)

#### **Code Quality**
- [ ] Add TypeScript strict mode
- [ ] Remove 'any' types
- [ ] Improve error handling
- [ ] Add JSDoc comments

#### **Testing**
- [ ] Unit tests (target: 80% coverage)
- [ ] Integration tests
- [ ] E2E tests for critical flows
- [ ] Performance tests

#### **Performance**
- [ ] Database query optimization
- [ ] Add missing indexes
- [ ] Implement caching
- [ ] Optimize bundle size

#### **Security**
- [ ] Security audit
- [ ] Penetration testing
- [ ] Update dependencies
- [ ] Implement rate limiting

#### **Documentation**
- [ ] API documentation
- [ ] User guides
- [ ] Video tutorials
- [ ] Developer documentation

---

## Risk Management

### High-Risk Items

**1. Spółka Accounting Complexity**
- Risk: Double-entry system is complex
- Mitigation: Start with simple cases, extensive testing
- Contingency: Hire accounting consultant

**2. KSeF Integration**
- Risk: Government API may be unstable
- Mitigation: Robust error handling, retry logic
- Contingency: Manual submission fallback

**3. Performance at Scale**
- Risk: System may slow with large datasets
- Mitigation: Optimize queries, implement pagination
- Contingency: Database optimization, caching

**4. User Adoption**
- Risk: Users may find system too complex
- Mitigation: Extensive UX testing, tutorials
- Contingency: Simplified mode, guided workflows

### Medium-Risk Items

**1. Bank Integration**
- Risk: Bank APIs may change
- Mitigation: Use stable API versions, monitoring
- Contingency: Manual import option

**2. Tax Regulation Changes**
- Risk: Polish tax law may change
- Mitigation: Modular tax calculation, easy updates
- Contingency: Quick patch releases

**3. Data Migration**
- Risk: Migrating existing data may fail
- Mitigation: Thorough testing, backups
- Contingency: Rollback plan, data recovery

---

## Resource Requirements

### Development Team

**Phase 3-4 (Weeks 1-4):**
- 1 Frontend Developer (full-time)
- 1 Backend Developer (part-time)
- 1 UI/UX Designer (part-time)

**Phase 5-6 (Weeks 5-12):**
- 1 Frontend Developer (full-time)
- 1 Backend Developer (full-time)
- 1 Data Analyst (part-time)

**Phase 7-8 (Weeks 13-24):**
- 2 Full-stack Developers (full-time)
- 1 Integration Specialist (full-time)
- 1 Accounting Consultant (part-time)

### Infrastructure

**Current:**
- Supabase (PostgreSQL)
- Vercel/Netlify hosting
- React frontend

**Additional Needs:**
- Redis cache (Phase 6+)
- Job queue (Phase 6+)
- File storage (Phase 7+)
- API gateway (Phase 8+)

---

## Success Criteria

### Phase 3-4 Success Criteria
- [ ] Users can post monthly invoices in < 5 minutes
- [ ] 90% of invoices auto-categorized
- [ ] UI is intuitive (< 3 clicks to any action)
- [ ] Expense posting works as smoothly as income

### Phase 5-6 Success Criteria
- [ ] All required reports available
- [ ] Reports generate in < 5 seconds
- [ ] 95% of invoices auto-posted
- [ ] Period closing takes < 10 minutes

### Phase 7-8 Success Criteria
- [ ] Spółka accounting fully functional
- [ ] Financial statements balance correctly
- [ ] Bank transactions sync automatically
- [ ] KSeF integration works reliably

### Overall Success Criteria
- [ ] User satisfaction > 4.5/5
- [ ] System uptime > 99.5%
- [ ] Data accuracy 100%
- [ ] Support tickets < 5 per week

---

## Milestones & Checkpoints

### Month 1 (Jan 20 - Feb 20)
- ✅ Phase 3 Complete: Enhanced UI/UX
- ✅ Phase 4 Complete: Expense management
- 📊 Checkpoint: User testing, feedback collection

### Month 2 (Feb 21 - Mar 20)
- ✅ Phase 5 Complete: Reporting & analytics
- ⏳ Phase 6 In Progress: Advanced features
- 📊 Checkpoint: Performance review, optimization

### Month 3 (Mar 21 - Apr 20)
- ✅ Phase 6 Complete: Advanced features
- ⏳ Phase 7 In Progress: Spółka accounting
- 📊 Checkpoint: Security audit, compliance review

### Month 4-6 (Apr 21 - Jul 5)
- ✅ Phase 7 Complete: Spółka accounting
- ✅ Phase 8 Complete: Integrations
- 📊 Final Checkpoint: Full system audit, launch preparation

---

## Conclusion

This roadmap provides a clear path forward for the accounting system over the next 6 months. The focus is on:

1. **Immediate:** Improve UX and add expense management
2. **Short-term:** Build reporting and analytics
3. **Medium-term:** Implement advanced features and automation
4. **Long-term:** Complete Spółka accounting and integrations

The system is well-positioned for success with a solid foundation already in place. By following this roadmap, we will deliver a comprehensive accounting solution that meets the needs of both JDG and Spółka entities.

**Next Steps:**
1. Review and approve roadmap with stakeholders
2. Begin Phase 3 implementation (Week 1)
3. Set up regular progress reviews (weekly)
4. Establish feedback loops with users
5. Monitor metrics and adjust as needed

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Next Review:** February 1, 2026  
**Owner:** Development Team
