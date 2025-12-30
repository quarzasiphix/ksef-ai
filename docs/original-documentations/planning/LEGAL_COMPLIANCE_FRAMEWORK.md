# Legal Compliance Framework: Pre-Issuance Layer

## The Core Legal Question

**"At what moment does a tax-relevant document legally come into existence?"**

This is the question you will be judged on. Not "Do you compete with KSeF?" but "Do you respect the legal boundary of invoice issuance?"

**If you respect that boundary, you are safe.**

---

## What Polish Law Actually Cares About

### Tax Authority Concerns (What Matters)

From a tax perspective, the state cares about:
1. **Moment of invoice issuance**
2. **Moment of tax obligation**
3. **Content of the final invoice**
4. **Consistency with economic reality**

### What the State Does NOT Care About

These are **civil-law artifacts, not tax artifacts:**
- Drafts
- Negotiations
- Pre-invoice documents
- Internal confirmations
- Client acknowledgements before issuance

**This is your legal opening.**

---

## Why the Pre-KSeF Layer Is Lawful by Design

### Your System Operates BEFORE These Events

- ✅ Before invoice issuance
- ✅ Before VAT obligation crystallizes
- ✅ Before KSeF submission

### What Exists in Your App at That Stage

Legally, these are:
- An **offer** (oferta)
- A **draft** (projekt)
- A **commercial proposal** (propozycja handlowa)
- A **settlement intent** (intencja rozliczenia)

**All fully legal and normal in commerce.**

### Key Principle (Non-Negotiable)

```
KSeF sees only ISSUED invoices.
Your system handles everything BEFORE issuance.
```

**As long as you respect this, there is no conflict.**

---

## The Most Important Safeguard (Must Be Explicit)

### Hard State Separation

You must **hard-separate** states in your system:

#### ✅ Allowed in Your System (Pre-KSeF)

**These are NOT invoices:**
- Draft invoices (projekty faktur)
- "Do akceptacji" (for acceptance)
- Negotiated amounts
- Dispute threads
- Corrections to drafts
- Withdrawn drafts

**Status labels:**
- `draft` - Projekt
- `pending_acceptance` - Do akceptacji
- `negotiating` - W uzgodnieniu
- `withdrawn` - Wycofany projekt

#### ⚠️ What Triggers KSeF Obligation

**Explicit user action:**
```
"Wystaw fakturę (dokument podatkowy)"
```

**Only at that moment:**
1. Document becomes legally an invoice
2. VAT obligation crystallizes
3. KSeF submission becomes mandatory

**Status labels:**
- `issued` - Wystawiona (dokument podatkowy)
- `submitted_to_ksef` - Wysłana do KSeF
- `accepted_by_ksef` - Zaakceptowana przez KSeF

### Implementation Requirements

1. **Separate database states** - `draft` vs `issued`
2. **Explicit UI action** - Big, clear "Wystaw fakturę" button
3. **Confirmation dialog** - "Czy na pewno chcesz wystawić dokument podatkowy?"
4. **Audit log** - Record exact moment of issuance
5. **No backdating** - Issuance date = action date

---

## Language Audit (Critical for Legal Safety)

### ✅ Safe Wording (Always Use)

**For pre-issuance documents:**
- `projekt faktury` (invoice draft)
- `dokument roboczy` (working document)
- `propozycja rozliczenia` (settlement proposal)
- `uzgodnienie handlowe` (commercial agreement)
- `akceptacja warunków` (acceptance of terms)
- `wycofany projekt` (withdrawn draft)
- `zmieniona propozycja` (changed proposal)
- `nowa wersja robocza` (new working version)

**For actions:**
- `uzgodnij` (agree on)
- `zaakceptuj warunki` (accept terms)
- `zakwestionuj` (dispute)
- `wycofaj projekt` (withdraw draft)

### ❌ Dangerous Wording (Never Use Before Issuance)

**NEVER call it an invoice before issuance:**
- ❌ `faktura` (before issuance)
- ❌ `wystawiona` (before issuance)
- ❌ `anulowana faktura` (if it never existed legally)
- ❌ `korekta` (for drafts - use "zmieniona propozycja")
- ❌ `skorygowana` (for drafts)

**This language audit alone can save you in a dispute.**

---

## The "Inwigilacja" Argument - How Far You Can Go

### ❌ You CANNOT Legally Say

- "We keep things hidden from the state"
- "We bypass KSeF"
- "We avoid surveillance"
- "We reduce state visibility"

### ✅ You CAN Say

- **"We reduce the number of corrections sent to KSeF"**
- **"We help companies submit correct, final invoices"**
- **"We restore the pre-invoice agreement phase"**
- **"We ensure only final, agreed documents become tax documents"**

**This is a procedural improvement, not resistance.**

---

## Audit Scenario (Stress Test)

### Auditor Question

**"Why were there no corrections in KSeF, but multiple versions internally?"**

### Correct Answer (Memorize This)

**"Because only the final, agreed invoice is a tax document. Earlier versions were commercial drafts, never issued."**

### Why This Works

This is consistent with:
- ✅ VAT law (ustawa o VAT)
- ✅ Civil law (kodeks cywilny)
- ✅ Accounting standards (ustawa o rachunkowości)

**Your system actually reduces audit friction.**

### Supporting Evidence You Can Provide

1. **Audit log showing issuance moment** - Clear timestamp when "Wystaw fakturę" was clicked
2. **Draft history** - All versions marked as "projekt", never "faktura"
3. **Acceptance trail** - Client agreed before issuance
4. **No backdating** - Issuance date matches action date
5. **KSeF submission proof** - Final document sent to KSeF

---

## Why Accountants and Lawyers Will Defend You

### Your App Helps Them By

1. **Documents intent** - Why decisions were made
2. **Preserves negotiation context** - What was discussed
3. **Shows acceptance trails** - Client agreed
4. **Prevents accidental issuance** - Explicit action required
5. **Lowers correction volume** - Fewer mistakes in KSeF

### This Helps Them Argue

- ✅ No sham transactions
- ✅ No retroactive intent
- ✅ No manipulation
- ✅ Better evidence, not hidden evidence

**You are giving them better documentation, not hiding documentation.**

---

## One Sentence Internal Rule (Non-Negotiable)

**"If a document has not been legally issued, it must never be described or treated as an invoice."**

### Bake This Into

1. **UI labels** - "Projekt faktury" not "Faktura"
2. **Logs** - "Draft created" not "Invoice created"
3. **Exports** - "Draft documents" not "Invoices"
4. **Documentation** - Clear distinction
5. **Marketing copy** - "Pre-invoice agreement"
6. **API responses** - `document_type: "draft"` not `"invoice"`
7. **Email notifications** - "Otrzymałeś projekt faktury do akceptacji"
8. **PDF watermarks** - "PROJEKT - NIE JEST DOKUMENTEM PODATKOWYM"

---

## Final Legal Positioning (Safest Form)

### The Official Statement

**"KsięgaI nie zastępuje KSeF. Działa przed KSeF — w fazie uzgodnień handlowych — aby do KSeF trafiały wyłącznie poprawne, finalne dokumenty."**

(KsięgaI does not replace KSeF. It operates before KSeF — in the commercial agreement phase — so that only correct, final documents reach KSeF.)

### Why This Works

- ✅ **True** - Factually accurate
- ✅ **Defensible** - Legally sound
- ✅ **Boring to regulators** - Not threatening (good)
- ✅ **Reassuring to accountants** - Helps their work

---

## Bottom Line

### You Are NOT Fighting Inwigilacja

You are:
1. **Restoring due process** - Commercial agreement before administrative record
2. **Protecting companies from premature publication** - Mistakes stay private
3. **Making KSeF cleaner downstream** - Fewer corrections, better data

**That is a legally strong position.**

---

## Implementation Checklist

### Database Schema

- [ ] Separate `draft` and `issued` states clearly
- [ ] Add `issued_at` timestamp (NULL for drafts)
- [ ] Add `issued_by_user_id` for audit trail
- [ ] Add `ksef_submission_id` (NULL until submitted)
- [ ] Never allow state transition from `issued` back to `draft`

### UI Requirements

- [ ] Draft documents labeled "Projekt faktury"
- [ ] Clear "Wystaw fakturę" button (not "Zapisz" or "Wyślij")
- [ ] Confirmation dialog before issuance
- [ ] Watermark on draft PDFs: "PROJEKT - NIE JEST DOKUMENTEM PODATKOWYM"
- [ ] Status badges: "Projekt" vs "Wystawiona"
- [ ] Timeline showing exact issuance moment

### Business Logic

- [ ] Issuance requires explicit user action
- [ ] Issuance date = action date (no backdating)
- [ ] Draft changes allowed, issued invoice changes forbidden
- [ ] KSeF submission only for issued invoices
- [ ] Audit log for all issuance events

### Language Audit

- [ ] Review all UI text for safe terminology
- [ ] Update email templates
- [ ] Fix API response labels
- [ ] Correct documentation
- [ ] Update marketing materials

### Legal Documentation

- [ ] Terms of Service: Explain draft vs issued distinction
- [ ] Privacy Policy: How draft data is handled
- [ ] User Guide: Clear explanation of issuance process
- [ ] FAQ: Address "Is this legal?" question
- [ ] Accountant Guide: How to explain to auditors

---

## Risk Mitigation

### Potential Legal Challenges

#### Challenge 1: "You're helping companies avoid KSeF"

**Response:**
"No. We help companies prepare correct documents before KSeF submission. Final invoices always go to KSeF. We reduce corrections, not submissions."

#### Challenge 2: "Drafts could be used for tax evasion"

**Response:**
"Drafts are not tax documents. They have no legal effect. Only issued invoices create tax obligations, and those always go to KSeF. We document the agreement process, making audits easier."

#### Challenge 3: "Why not submit drafts to KSeF too?"

**Response:**
"Because drafts are not invoices. Submitting every draft would create noise in KSeF and make audits harder. We ensure only final, agreed documents are submitted."

#### Challenge 4: "This creates parallel accounting"

**Response:**
"No. This is pre-accounting. Like contract negotiation before signing. Once issued, the invoice enters accounting and KSeF. We don't maintain parallel records."

### Red Flags to Avoid

1. **❌ Backdating issued invoices** - Always use action date
2. **❌ Calling drafts "invoices"** - Strict language discipline
3. **❌ Allowing issued invoice edits** - Only drafts can be changed
4. **❌ Skipping KSeF submission** - All issued invoices must go to KSeF
5. **❌ Marketing as "KSeF alternative"** - It's a pre-KSeF layer

---

## Compliance Monitoring

### Regular Audits

**Monthly:**
- Review UI text for language compliance
- Check that all issued invoices went to KSeF
- Verify no backdating occurred
- Audit log review for suspicious patterns

**Quarterly:**
- Legal review of new features
- Accountant feedback on compliance
- Update FAQ based on user questions
- Review competitor positioning

**Annually:**
- Full legal audit by external counsel
- Update terms of service if needed
- Review changes in VAT/KSeF regulations
- Train support team on compliance

### Metrics to Track

1. **Draft-to-issuance ratio** - How many drafts per issued invoice
2. **Time in draft state** - Average negotiation time
3. **KSeF submission rate** - Should be 100% of issued invoices
4. **Correction rate** - Should be lower than industry average
5. **Audit inquiries** - Track any questions from authorities

---

## Training Materials

### For Support Team

**Key talking points:**
1. "Drafts are not invoices - they're commercial proposals"
2. "Issuance is explicit - user must click 'Wystaw fakturę'"
3. "All issued invoices go to KSeF - we don't bypass anything"
4. "We reduce corrections by getting agreement first"
5. "This is legal and helps accountants"

### For Sales Team

**Safe pitches:**
- "Agree on invoices before they become tax documents"
- "Reduce KSeF corrections by 80%"
- "Give your accountant clean, agreed documents"
- "Audit-ready from day one"

**Forbidden pitches:**
- ❌ "Avoid KSeF"
- ❌ "Keep invoices private"
- ❌ "Reduce tax visibility"

### For Users (Onboarding)

**Key education:**
1. What's a draft vs issued invoice
2. When to click "Wystaw fakturę"
3. Why agreement before issuance matters
4. How this helps in audits
5. What goes to KSeF and when

---

## Conclusion

### The Legal Foundation

**You are not fighting the system. You are restoring the natural order of commerce:**

```
Private Phase (KsięgaI):     Agreement on commercial terms
Administrative Phase (KSeF):  Registration of agreed facts
```

**This is not evasion. This is due process.**

### The Three Pillars of Legal Safety

1. **Hard state separation** - Draft ≠ Invoice
2. **Explicit issuance action** - Clear legal moment
3. **Language discipline** - Never call drafts "invoices"

**Follow these, and you are legally defensible.**

### Final Word

**"At what moment does a tax-relevant document legally come into existence?"**

**Answer: When the user clicks "Wystaw fakturę (dokument podatkowy)". Before that, it's a commercial draft. After that, it goes to KSeF.**

**This boundary is your legal shield. Respect it absolutely.**
