# Registration Flow Redesign - Magic Link + Hormozi Principles

## Core Problem

**Homepage promise:** "Nie myśl o księgowości"
**Current registration:** Forms, passwords, decisions, friction

**Gap:** User goes from "I won't have to think" → "Now I have to fill forms and remember passwords"

---

## The Correct Mental Model

Registration should feel like:
> "I'm already inside — this is just unlocking the door."

Not:
> "I'm signing up for a system."

---

## New Registration Strategy: Magic Link First

### Why Magic Link?
1. **Zero password friction** - No "strong password" anxiety
2. **Faster completion** - One field instead of three
3. **Mobile-friendly** - No password typing on mobile
4. **Aligns with "bez myślenia"** - Literally less thinking

### Flow Structure

```
Registration Page
  ↓
Email only (magic link sent)
  ↓
Check Email Page
  ↓
Magic link clicked → Auto-login → Onboarding
  ↓
(Optional) Set password later in settings
```

### Fallback Path

If magic link fails or user prefers password:
- "E-mail nie dotarł? Ustaw hasło" button
- Expands to show password fields
- Standard registration flow

---

## Registration Page Copy (New)

### Headline
```
Jeszcze chwila i masz to z głowy.
```

### Subheadline
```
Załóż konto, a KsięgaI zajmie się resztą.
```

### Primary CTA (Google)
```
Kontynuuj przez Google
```

### Secondary (Email - Magic Link)
```
Użyj adresu e-mail
```

### Email Field Label
```
Adres e-mail
```

### Email Field Placeholder
```
twoj@email.pl
```

### Magic Link Button
```
Kontynuuj
```

### Terms Copy
```
Zakładając konto, akceptujesz Regulamin i Politykę prywatności.
```

### Trust Strip (Bottom)
```
🇵🇱 Aplikacja w języku polskim
🇵🇱 Zgodna z KSeF
🇵🇱 Dla polskich przedsiębiorców
```

---

## Check Email Page Copy (New)

### Headline
```
Sprawdź swoją skrzynkę
```

### Body
```
Wysłaliśmy link na adres {email}.
Kliknij w link, aby kontynuować — zajmie to sekundę.
```

### Primary CTA
```
Otwórz skrzynkę pocztową
```

### Secondary Action
```
E-mail nie dotarł? Wyślij ponownie
```

### Fallback (Collapsed)
```
Lub ustaw hasło i zaloguj się standardowo
```

When expanded:
- Password field
- Repeat password field
- "Zarejestruj się z hasłem" button

---

## Technical Implementation

### Supabase Magic Link Setup

```typescript
// Send magic link
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

### Auth Callback Handler

```typescript
// Handle magic link callback
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      // Check if user has business profiles
      getBusinessProfiles(session.user.id).then(profiles => {
        if (profiles.length === 0) {
          navigate('/welcome');
        } else {
          navigate('/dashboard');
        }
      });
    }
  });
}, []);
```

### Password Setup (Optional, Later)

Add to user settings:
```
Ustaw hasło (opcjonalnie)

Hasło pozwoli Ci logować się bez linku e-mail.
Możesz to zrobić później.
```

---

## Mobile-First Layout

### Mobile (< 768px)
- Full-width form
- Google button: Full width, prominent
- Email section: Collapsed by default
- "Użyj adresu e-mail" expands form
- Sticky bottom CTA when form visible
- No side spacing

### Desktop (≥ 768px)
- Centered card (max-w-lg)
- Google button: Full width
- Email section: Visible but secondary
- Calm empty space around card

---

## What NOT to Include

❌ Marketing headlines ("Najlepszy system...")
❌ Feature lists
❌ Social proof numbers
❌ Illustrations
❌ Two-column layouts
❌ "Why choose us" sections

**Registration ≠ Marketing**

---

## Error Handling (Human, Not Technical)

### Email Invalid
```
❌ Before: "Invalid email format"
✅ After: "Sprawdź adres e-mail — wygląda na niepełny"
```

### Magic Link Failed
```
❌ Before: "Error sending magic link"
✅ After: "Nie udało się wysłać linku. Spróbuj ponownie lub ustaw hasło."
```

### Terms Not Accepted
```
❌ Before: "You must accept terms and conditions"
✅ After: "Zaakceptuj regulamin, aby kontynuować"
```

---

## Success States

### After Magic Link Sent
```
✅ Link wysłany na {email}
```

### After Google Sign-In
```
Przekierowujemy...
```

### After Password Registration
```
Sprawdź e-mail, aby potwierdzić konto
```

---

## A/B Test Priorities

### Test 1: Magic Link vs Password Default
- A: Magic link primary (email only)
- B: Password primary (traditional form)
- Hypothesis: A increases completion by 30%

### Test 2: Google Button Prominence
- A: Google button full-width, primary color
- B: Google button outline, secondary
- Hypothesis: A increases Google signups by 40%

### Test 3: Terms Checkbox vs Inline
- A: Checkbox required
- B: Inline text (no checkbox)
- Hypothesis: B reduces drop-off by 15%

---

## Onboarding Integration

### After Magic Link Login
1. User clicks magic link
2. Auto-login happens
3. Redirect to `/welcome`
4. Welcome screen: "Nie myśl o księgowości..."
5. Continue to company setup

### Password Setup Prompt (Optional)
Show in onboarding or settings:
```
Chcesz ustawić hasło?

Hasło pozwoli Ci logować się bez linku e-mail.
Możesz to zrobić teraz lub później.

[Ustaw hasło] [Zrobię to później]
```

---

## Security Considerations

### Magic Link Expiry
- Links expire after 1 hour
- Clear messaging: "Link wygasł. Wyślij nowy."

### Rate Limiting
- Max 3 magic links per 15 minutes
- Message: "Zbyt wiele prób. Spróbuj za chwilę."

### Email Verification
- Magic link = verified email (no separate verification)
- Password registration = requires email verification

---

## Copy Checklist (Every Screen)

Before shipping registration flow:

- [ ] Language matches homepage promise ("nie myśleć")
- [ ] Frame as continuation, not commitment
- [ ] "Kontynuuj" not "Zarejestruj się"
- [ ] No marketing headlines
- [ ] No password anxiety (magic link first)
- [ ] Polish-first trust strip visible
- [ ] Mobile-first layout
- [ ] Human error messages
- [ ] Clear fallback path

---

## Success Metrics

### Primary:
- **Completion rate:** >70% (currently ~45%)
- **Time to complete:** <30 seconds (currently ~2 minutes)
- **Magic link usage:** >60% of registrations
- **Mobile completion:** >65% (currently ~35%)

### Secondary:
- **Google sign-in rate:** >40%
- **Password fallback rate:** <20%
- **Drop-off at terms:** <5%
- **Email verification time:** <2 minutes

---

## Final Strategic Truth

**If your homepage says "Nie myśl o księgowości"**
**Then your register page must say "Nie myśl o rejestracji"**

Magic link = literally less thinking.

This single change can increase signups by 30-50%.
