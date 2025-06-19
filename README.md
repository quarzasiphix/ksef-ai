# KsiegaI - Nowoczesny System Fakturowania i Księgowości

KsiegaI to kompleksowe rozwiązanie dla przedsiębiorców i księgowych, łączące w sobie funkcje fakturowania, zarządzania wydatkami i zaawansowanej księgowości w jednym, intuicyjnym interfejsie.

## 🌟 Kluczowe Funkcje

### Dla Wszystkich Użytkowników
- **Profesjonalne Fakturowanie**
  - Tworzenie i zarządzanie fakturami w kilka kliknięć
  - Automatyczne generowanie numerów faktur
  - Wysyłka faktur bezpośrednio do klientów
  - Archiwizacja dokumentów w chmurze

- **Zarządzanie Wydatkami**
  - Śledzenie wszystkich kosztów działalności
  - Kategoryzacja wydatków
  - Skanowanie i archiwizacja dokumentów
  - Raporty finansowe w czasie rzeczywistym

- **CRM i Zarządzanie Klientami**
  - Baza danych klientów
  - Historia transakcji
  - Automatyczne przypomnienia o płatnościach
  - Profilowanie klientów

### Funkcje Premium
- **Integracja z KSeF**
  - Automatyczne wysyłanie faktur do Krajowego Systemu e-Faktur
  - Synchronizacja z systemem podatkowym
  - Generowanie JPK-V7M

- **Zaawansowana Księgowość**
  - Automatyczne rozliczenia podatkowe
  - Generowanie deklaracji PIT
  - Profesjonalne raporty księgowe
  - Wsparcie dla różnych form opodatkowania

- **AI i Automatyzacja**
  - Automatyczne rozpoznawanie dokumentów
  - Inteligentne kategoryzowanie transakcji
  - Asystent księgowy oparty na AI
  - Automatyczne przypomnienia o obowiązkach

- **Integracja Bankowa**
  - Monitorowanie transakcji w czasie rzeczywistym
  - Automatyczne dopasowywanie płatności
  - Synchronizacja z kontem firmowym
  - Alerty o nowych transakcjach

## 🚀 Technologie

- **Frontend**
  - React
  - TypeScript
  - Tailwind CSS
  - shadcn/ui

- **Backend**
  - Supabase
  - PostgreSQL
  - Node.js

## 💻 Rozwój Lokalny

```sh
# 1. Sklonuj repozytorium
git clone <URL_REPOZYTORIUM>

# 2. Przejdź do katalogu projektu
cd ksef-ai

# 3. Zainstaluj zależności
npm install

# 4. Uruchom serwer deweloperski
npm run dev
```

## 📱 Dostępność

Aplikacja jest dostępna jako:
- Aplikacja webowa
- Aplikacja mobilna (wkrótce)
- Integracja z popularnymi systemami księgowymi

## 🔒 Bezpieczeństwo

- Szyfrowanie danych end-to-end
- Regularne kopie zapasowe
- Zgodność z RODO
- Certyfikacja bezpieczeństwa

## 📞 Wsparcie

- Email: support@ksiegai.pl
- Telefon: +48 123 456 789
- Dokumentacja: docs.ksiegai.pl

## 📄 Licencja

© 2024 KsiegaI. Wszelkie prawa zastrzeżone.

## 🤝 Współpraca i Uprawnienia

KsiegaI umożliwia bezpieczne łączenie się z innymi użytkownikami aplikacji w celu wspólnej pracy na tych samych danych firmowych.

### Typy ról

| Rola | Uprawnienia |
|------|-------------|
| **Właściciel** | Pełny dostęp do wszystkich modułów, może zapraszać/usuwać użytkowników, zmieniać ich role. |
| **Księgowy** (Accountant) | Odczyt i tworzenie faktur, podgląd wydatków, generowanie raportów księgowych, brak dostępu do ustawień firmy i zarządzania użytkownikami. |
| **Pełnomocnik** | Wystawianie oraz edycja faktur w imieniu firmy, wgląd w listę klientów i produktów, brak dostępu do sekcji księgowość i ustawień. |
| **Tylko-odczyt** | Przegląd dokumentów bez możliwości wprowadzania zmian. |

### Jak to działa

1. **Zaproszenie e-mail** – właściciel wpisuje adres e-mail użytkownika i przypisuje mu rolę.
2. **Akceptacja** – zaproszona osoba zakłada konto (jeśli go nie ma) i akceptuje zaproszenie.
3. **Udostępnione zasoby** – po akceptacji obie strony widzą odpowiednie dokumenty w swoich panelach (np. udostępnione faktury pojawiają się w zakładce *Otrzymane*).
4. **Zarządzanie rolami** – właściciel może w dowolnym momencie zmienić rolę lub odebrać dostęp.

### Bezpieczeństwo

- Każda operacja zapisu przechodzi przez weryfikację roli po stronie Supabase RLS.
- Logujemy historię zmian, aby móc odtworzyć kto i kiedy dokonał edycji.
- Możliwość ustawienia dwuetapowej autoryzacji (2FA) dla ról wysokiego zaufania.

---

## 🛠️ Plan Rozbudowy Funkcji Ról

1. **Model danych**
   - Tabela `business_user_roles` z polami: `business_profile_id`, `user_id`, `role`, `invited_by`, `status` (pending/accepted).
2. **API / Supabase**
   - Procedury SQL do tworzenia zaproszeń, akceptacji i odrzucenia.
   - Reguły RLS zapewniające, że:
     - tylko właściciel może zmieniać role,
     - użytkownik widzi tylko profile, do których ma dostęp.
3. **UI**
   - Sekcja *Użytkownicy firmy* w ustawieniach:
     - lista osób + ich rola,
     - przycisk *Zaproś* z formularzem (email + rola),
     - możliwość edycji lub usunięcia.
   - W widoku faktury znacznik *Udostępniona*.
4. **Powiadomienia**
   - E-mail + toast w aplikacji po otrzymaniu zaproszenia.
   - Przypomnienia o oczekujących zaproszeniach.
5. **Testy i audyt**
   - Scenariusze E2E (Cypress/Playwright) sprawdzające przepływ zaproszenia i uprawnień.
   - Audyt RLS – upewnić się, że brak eskalacji uprawnień.

✨ **Cel:** pełna, zgodna z RODO współpraca księgowa w czasie rzeczywistym bez utraty kontroli nad danymi.
