# A/B Test Variants - Homepage Headlines

## Current Implementation (NUCLEAR HEADLINE - PRIMARY)

**Headline:**
```
Nie myśl o księgowości.
```

**Subheadline:**
```
KsięgaI dopilnuje faktur, podatków i porządku w firmie za Ciebie.
```

**Why this works:**
- Starts with commanded relief ("Nie myśl…")
- Explicit delegation of responsibility
- Names three real anxieties (faktury, podatki, porządek)
- "za Ciebie" is psychologically very strong in PL
- This is the primary bet

---

## Variant A — Fear-first (for colder traffic)

**Headline:**
```
Błędy w księgowości kosztują czas i pieniądze.
```

**Subheadline:**
```
KsięgaI pilnuje tego, żebyś ich nie popełniał.
```

**Why:**
- Names cost directly
- Implies protection
- Appeals to responsibility without shame
- Good for ads targeting people who've had problems

**Implementation notes:**
- Replace hero H1 and first paragraph only
- Keep all other sections identical
- Track: scroll depth, CTA click, signup completion

---

## Variant B — Speed & Ease (for ads / impatient users)

**Headline:**
```
Pierwsza faktura w 5 minut.
```

**Subheadline:**
```
Resztą zajmie się KsięgaI.
```

**Why:**
- Immediate win promise
- Minimal effort required
- Clear sequence: you act once → system handles rest
- Strong for performance marketing

**Implementation notes:**
- Very short, very direct
- Best for paid traffic (Google Ads, Facebook)
- Emphasizes speed over relief

---

## Variant C — Authority without flex (for professionals)

**Headline:**
```
Porządek w finansach firmy — bez Excela, bez stresu, bez zgadywania.
```

**Subheadline:**
```
KsięgaI ogarnia faktury, wydatki i podatki za Ciebie.
```

**Why:**
- Removes common pain symbols (Excel, stress, guessing)
- Clean, mature, credible tone
- Strong for accountants + experienced founders
- Professional without being corporate

**Implementation notes:**
- Longer headline but rhythm works
- Good for organic traffic from search
- Appeals to people who've tried other solutions

---

## Variant D — Outcome identity (emotional, identity-based)

**Headline:**
```
Prowadź firmę, nie księgowość.
```

**Subheadline (REQUIRED WITH THIS VARIANT):**
```
KsięgaI zajmuje się fakturami, wydatkami i podatkami w tle.
```

**Why:**
- Identity shift language
- Extremely simple and memorable
- Dangerous if used alone (too vague)
- Strong with context provided by subheadline

**Implementation notes:**
- MUST include subheadline or it's too abstract
- Best for remarketing / warm traffic
- Appeals to aspirational identity

---

## Testing Protocol

### What to keep identical:
- All sections below hero
- CTA copy and placement
- Page layout and design
- Trust indicators

### What to change:
- Hero H1 only
- Hero subheadline only
- SEO title tag (match headline)

### Metrics to track:
1. **Scroll depth** - Do they read past hero?
2. **CTA click rate** - Do they click "Zacznij za darmo"?
3. **Signup completion** - Do they finish registration?
4. **Time on page** - Are they engaged?

### Minimum sample size:
- 500-1,000 visits per variant
- Run for at least 7 days
- Check statistical significance before declaring winner

### Implementation:
```typescript
// Example: Simple A/B test with localStorage
const getHeadlineVariant = () => {
  const stored = localStorage.getItem('headline_variant');
  if (stored) return stored;
  
  const variants = ['nuclear', 'fear', 'speed', 'authority', 'identity'];
  const random = variants[Math.floor(Math.random() * variants.length)];
  localStorage.setItem('headline_variant', random);
  return random;
};
```

---

## The Deep Truth

**You are not selling:**
- Accounting software
- Features
- Technology

**You are selling:**
- Removal of responsibility
- Peace of mind
- Freedom from worry
- Delegation of mental burden

**The headline must communicate this in under 2 seconds.**

---

## CTA A/B Test Variants

### Current CTA (Relief-focused - LIVE)
```
Zdejmij księgowość z głowy — zacznij za darmo
```

**Why this works:**
- Leads with outcome (relief)
- Action is secondary
- Psychological benefit first
- Hormozi-style relief framing

### CTA Variant A (Mechanics-focused)
```
Zacznij za darmo — bez karty, bez ryzyka
```

**Why to test:**
- More traditional SaaS framing
- Removes friction explicitly
- May perform better for skeptical users
- Clear value proposition

**Test hypothesis:** Relief-focused CTA will outperform mechanics-focused by 15-25% on cold traffic.

---

## Current Status

✅ **Nuclear headline (primary)** - IMPLEMENTED
✅ **Relief-focused CTA** - IMPLEMENTED
✅ **Tightened subheadline** - IMPLEMENTED
✅ **KSeF compliance elevated** - IMPLEMENTED (🇵🇱 flag added)
✅ **Dashboard reframing** - IMPLEMENTED
✅ **Premium CTA sharpened** - IMPLEMENTED

⏳ Variant A (fear-first) - Ready to test
⏳ Variant B (speed) - Ready to test
⏳ Variant C (authority) - Ready to test
⏳ Variant D (identity) - Ready to test

**Next step:** Run CTA test (Relief vs. Mechanics) for 1,000 visits each, then test headline variants.
