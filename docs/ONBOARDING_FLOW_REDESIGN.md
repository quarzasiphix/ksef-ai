# Onboarding Flow Redesign - Hormozi Principles

## Current State Analysis

The current onboarding flow is **functional but feature-focused**. It walks users through setup steps but doesn't deliver on the homepage promise: "nie myśleć o księgowości."

---

## Core Problem

**Homepage promise:** "Nie myśl o księgowości. System dopilnuje za Ciebie."

**Onboarding reality:** "Przeprowadzimy Cię przez kilka szybkich kroków, aby skonfigurować Twoje konto..."

**Gap:** User goes from "I won't have to think" → "Now I have to configure things"

This breaks the psychological contract.

---

## Hormozi Onboarding Principles

### 1. First 5 Minutes = Proof of Promise
- User should experience "no thinking" immediately
- Quick win before asking for data
- Deliver relief, not setup

### 2. Frame Setup as Protection, Not Work
- "Zabezpieczamy Twoje dane" not "Uzupełnij profil"
- "Przygotowujemy system" not "Skonfiguruj konto"
- Every step = removing future worry

### 3. Progressive Disclosure
- Only ask for what's needed NOW
- Everything else = "możesz to zrobić później"
- Never block quick win with setup

---

## Redesigned Flow Structure

### Phase 1: Immediate Value (0-2 minutes)
**Goal:** Prove the promise before asking for anything

**Current:** Welcome screen → Choose company type → Long form
**New:** Quick company detection → Instant dashboard preview → "To już działa"

### Phase 2: Essential Setup (2-5 minutes)
**Goal:** Minimum data to make first invoice possible

**Current:** Profile → Bank → Customer → Product
**New:** Company basics → First invoice preview → "Gotowe do wysłania"

### Phase 3: Optional Depth (Later)
**Goal:** Everything else happens in-app, not during onboarding

**Current:** Forced linear flow
**New:** Contextual prompts when needed

---

## Specific Copy Changes

### Welcome Screen

**Current:**
```
Witamy w KsięgaI!

Przeprowadzimy Cię przez kilka szybkich kroków, 
aby skonfigurować Twoje konto i przygotować do wystawiania faktur.

[Rozpocznij konfigurację]
```

**Problems:**
- "kilka szybkich kroków" = work
- "skonfigurować" = technical
- "przygotować" = not ready yet

**New:**
```
Nie myśl o księgowości.

Za chwilę zobaczysz, jak system działa za Ciebie. 
Wystarczy podać podstawowe dane firmy — resztą zajmiemy się my.

[Zobacz, jak to działa]
```

**Why better:**
- Echoes homepage promise
- "za chwilę zobaczysz" = immediate
- "resztą zajmiemy się my" = delegation
- CTA = experience, not work

---

### Choose Company Type

**Current:**
```
Dodaj firmę

Wybierz typ działalności, a my dopasujemy kreator do Twoich potrzeb
```

**Problems:**
- "Dodaj" = work
- "kreator" = tool language
- "potrzeb" = vague

**New:**
```
Jaki typ firmy prowadzisz?

Dopasujemy system do polskich przepisów dla Twojej formy działalności.

[JDG] [Sp. z o.o.] [S.A.]
```

**Why better:**
- Question, not command
- "dopasujemy system" = we do the work
- "polskich przepisów" = authority anchor
- Shorter, clearer

---

### Profile Step

**Current:**
```
Uzupełnij swój profil

Podaj swoje dane, abyśmy mogli spersonalizować 
Twoje doświadczenie w aplikacji.
```

**Problems:**
- "Uzupełnij" = work
- "spersonalizować doświadczenie" = marketing fluff
- Doesn't explain WHY

**New:**
```
Kto będzie wystawiał faktury?

Twoje dane pojawią się na fakturach jako osoba kontaktowa. 
Możesz to zmienić później.

[Form fields]

Możesz pominąć — uzupełnisz to, gdy będzie potrzebne.
```

**Why better:**
- Practical reason (faktury)
- "Możesz to zmienić" = no pressure
- "Możesz pominąć" = optional
- Clear purpose

---

### Bank Account Step

**Current:**
```
Dodaj konta bankowe

Dodaj konta bankowe swojej firmy. 
Jeśli jesteś VAT-owcem, zalecamy dodanie konta VAT.
```

**Problems:**
- "Dodaj" = work
- Technical VAT language
- No clear benefit

**New:**
```
Na jakie konto klienci mają płacić?

Podaj numer konta, który pojawi się na fakturach. 
Możesz dodać więcej kont później.

[Form fields]

💡 Jeśli jesteś VAT-owcem, możesz dodać osobne konto VAT 
   (split payment) — ale nie musisz tego robić teraz.
```

**Why better:**
- Practical question (gdzie płacić)
- "pojawi się na fakturach" = clear purpose
- VAT = optional, explained simply
- "nie musisz tego robić teraz" = no pressure

---

### Customer Step

**Current:**
```
Dodaj pierwszego klienta

Dodaj kontrahenta, aby móc szybko wystawiać mu faktury.
```

**Problems:**
- "Dodaj" = work
- "kontrahenta" = formal
- Feels like homework

**New:**
```
Komu chcesz wystawić pierwszą fakturę?

Podaj dane klienta — zapisze się w systemie 
i będziesz mógł wystawiać mu faktury jednym kliknięciem.

[Form fields]

Możesz pominąć — dodasz klienta przy pierwszej fakturze.
```

**Why better:**
- Practical question
- "jednym kliknięciem" = future ease
- "Możesz pominąć" = optional
- Ties to immediate action (pierwsza faktura)

---

### Product Step

**Current:**
```
Dodaj produkt lub usługę

Stwórz pozycje, które będą pojawiać się na Twoich fakturach.
```

**Problems:**
- "Stwórz pozycje" = work
- "będą pojawiać się" = future, vague
- No clear benefit

**New:**
```
Co sprzedajesz?

Zapisz swoją usługę lub produkt — 
następnym razem wystawisz fakturę w 30 sekund.

[Form fields]

Możesz pominąć — opiszesz to przy pierwszej fakturze.
```

**Why better:**
- Simple question
- "30 sekund" = concrete benefit
- "Możesz pominąć" = optional
- Clear time-saving promise

---

### Completion Step

**Current:**
```
Konto gotowe!

Gratulacje! Twoje konto jest gotowe do pracy. 
Możesz już w pełni korzystać z KsięgaI.

[Wypróbuj 7-dniowy trial] [Wystaw pierwszą fakturę] [Przejdź do pulpitu]
```

**Problems:**
- "Gratulacje" = patronizing
- "gotowe do pracy" = now work starts
- Too many CTAs (decision paralysis)

**New:**
```
System gotowy. Księgowość ogarnie się sama.

Wystawiasz faktury — resztą zajmie się KsięgaI.
Podatki, terminy, porządek — wszystko pod kontrolą.

[Wystaw pierwszą fakturę — 30 sekund]

Lub przejdź do pulpitu i zobacz, co system już przygotował.
```

**Why better:**
- "System gotowy" not "konto gotowe"
- Reinforces homepage promise
- "ogarnie się sama" = delegation
- One primary CTA (first invoice)
- Secondary option (dashboard)
- Removes Premium push (too early)

---

## Progress Bar Language

**Current:**
```
Konfiguracja konta
[Pomiń konfigurację]
```

**Problems:**
- "Konfiguracja" = technical work
- "Pomiń" = you're wasting time

**New:**
```
Przygotowujemy system
[Przejdź do pulpitu]
```

**Why better:**
- "Przygotowujemy" = we do the work
- "Przejdź do pulpitu" = positive action, not skipping

---

## Bottom Trust Line

**Current:**
```
Dołącz do tysięcy przedsiębiorców, którzy zaufali KsięgaI.
```

**Problems:**
- Generic social proof
- "Dołącz" = you're not in yet
- Vague numbers

**New:**
```
Zbudowane dla polskich przedsiębiorców — w kraju i za granicą.
```

**Why better:**
- Reinforces Polish-first positioning
- "Zbudowane" = already done for you
- Matches homepage authority

---

## Technical Implementation Notes

### Skip Logic
- Every step after company type = skippable
- "Pomiń" becomes "Zrobię to później"
- Skipped steps = contextual prompts in-app

### Progress Tracking
- Don't show "X of Y steps"
- Show "Przygotowujemy system" with progress bar
- Completion = "Gotowe" not "100%"

### Error Handling
- Never say "Błąd" or "Nieprawidłowe dane"
- Use: "Sprawdź [field] — wygląda na niepełny"
- Frame as help, not failure

### Success States
- Never say "Zapisano" or "Dodano"
- Use: "Gotowe" or "Zapisane"
- Minimal, confident

---

## A/B Test Priorities

### Test 1: Welcome Screen CTA
- A: "Rozpocznij konfigurację"
- B: "Zobacz, jak to działa"
- Hypothesis: B reduces drop-off by 20%

### Test 2: Skip Visibility
- A: "Pomiń" button visible
- B: "Zrobię to później" link at bottom
- Hypothesis: B increases completion by 15%

### Test 3: Completion CTA
- A: Three buttons (trial, invoice, dashboard)
- B: One primary (invoice) + one secondary (dashboard)
- Hypothesis: B increases first invoice rate by 25%

---

## Success Metrics

### Primary:
- **Time to first invoice:** <5 minutes (currently ~15 min)
- **Completion rate:** >80% (currently ~60%)
- **Drop-off at profile step:** <10% (currently ~25%)

### Secondary:
- **Skip rate:** 40-60% (healthy — means we're not blocking)
- **Return to complete skipped steps:** >50% within 7 days
- **User sentiment:** "easy" not "quick" (quality over speed)

---

## Copy Checklist (Every Screen)

Before shipping any onboarding screen, verify:

- [ ] Language matches homepage promise ("nie myśleć")
- [ ] Frame as relief, not work
- [ ] Clear practical reason (not marketing fluff)
- [ ] "Możesz pominąć" or equivalent (except company type)
- [ ] No technical jargon (konfiguracja, kreator, etc.)
- [ ] Confident, not apologetic
- [ ] Polish-first positioning visible

---

## Final Strategic Truth

**Onboarding is not setup. It's proof.**

The first 5 minutes should prove the homepage promise:
- User sees system working
- User feels relief, not work
- User trusts delegation

Everything else can happen later, in context, when needed.

**Bad onboarding:** "Here's how to use the tool"
**Good onboarding:** "See? It already works. You're done thinking."
