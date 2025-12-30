# Nadpłaty (Overpayments) — Model rozliczeń bank ↔ faktury

Ten dokument opisuje sposób obsługi **nadpłat (nadpłata bankowa)** powstających w momencie dopasowania transakcji bankowej do faktury, w systemie Księgal.

Celem projektu jest:
- zachowanie poprawności księgowej i podatkowej,
- pełna audytowalność,
- brak „magicznego” zwiększania wartości faktur,
- spójność z istniejącym modelem: Decyzja → Faktura → Bank → Księga.

---

## 1. Definicja problemu

**Nadpłata** występuje, gdy:

kwota_transakcji_bankowej > kwota_faktury

markdown
Copy code

Przykład:
- Faktura FV/030: 1 000,00 PLN
- Transakcja bankowa: 1 200,00 PLN
- Nadpłata: 200,00 PLN

**Zasada nadrzędna**:
> Faktura ma stałą, niezmienną wartość prawną i nie może „wchłonąć” nadpłaty.

---

## 2. Model koncepcyjny (ważne)

System **NIE przypisuje** transakcji bankowej bezpośrednio do faktury jako całości.

Zamiast tego stosowany jest model **linii rozliczeniowych (Settlement Lines)**.

### Obiekty bazowe

- `BankTransaction`
- `Invoice`
- `SettlementLine`
- (opcjonalnie) `CustomerCredit`, `RefundRequest`, `AdditionalDocument`

---

## 3. Mechanizm dopasowania (Matching)

### Krok 1 — Dopasowanie transakcji do faktury

Po ręcznym lub automatycznym dopasowaniu:

- Tworzona jest `SettlementLine`:
  - kwota = `min(transaction.amount, invoice.remaining)`
  - cel = `Invoice`

W przykładzie:
- 1 000,00 PLN → FV/030

### Krok 2 — Wykrycie nadpłaty

Jeżeli:
transaction.amount > suma_settlement_lines

yaml
Copy code

→ system tworzy **nadpłatę do rozliczenia**.

---

## 4. Status faktury po dopasowaniu

Faktura:
- status: **Opłacona**
- kwota zapłacona: 1 000,00 PLN
- brak modyfikacji kwoty dokumentu

Transakcja:
- status: **Częściowo rozliczona**
- pozostała kwota: 200,00 PLN (nadpłata)

---

## 5. Możliwe ścieżki obsługi nadpłaty

Każda nadpłata **musi zostać jawnie sklasyfikowana**.

### 5.1 Zaliczka / saldo kontrahenta (rekomendowane)

**Opis**  
Nadpłata staje się saldem klienta do wykorzystania w przyszłości.

**System**
- Tworzony obiekt `CustomerCredit`
- Powiązania:
  - kontrahent
  - transakcja bankowa
  - faktura źródłowa (referencyjnie)

**Znaczenie księgowe**
- Nie jest przychodem
- Jest zobowiązaniem (zaliczką)

**UI**
- Faktura: ✅ Opłacona
- Transakcja: „Nadpłata 200 PLN → saldo kontrahenta”

---

### 5.2 Rozliczenie na inne faktury tego kontrahenta

**Warunek**
- Kontrahent ma inne nieopłacone faktury

**System**
- Nadpłata dzielona na kolejne `SettlementLine`
- Każda linia wskazuje inną fakturę

**Zasada**
- Jedna transakcja bankowa może rozliczać wiele faktur
- Każda faktura zachowuje swoją oryginalną kwotę

---

### 5.3 Zwrot nadpłaty

**Opis**
- Nadpłata jest błędem i środki mają zostać zwrócone

**System**
- Tworzony obiekt `RefundRequest`
- Status: `pending`
- Oczekuje na transakcję wychodzącą

**Po zwrocie**
- Transakcja wychodząca dopasowana do `RefundRequest`
- Nadpłata zamknięta

---

### 5.4 Dopłata / dodatkowy dokument (rzadkie)

**Uwaga**
- Wymaga podstawy prawnej
- Zwykle konieczna faktura korygująca lub nowy dokument

**System**
- Opcja dostępna tylko dla uprawnionych ról
- Tworzony nowy dokument powiązany z nadpłatą

---

## 6. Reguły systemowe (twarde)

1. ❌ Faktura **nie zmienia wartości**
2. ❌ Nadpłata **nie znika automatycznie**
3. ✅ Każda złotówka transakcji musi mieć:
   - settlement target
   - historię
4. ✅ Wszystkie operacje są odwracalne (audit trail)

---

## 7. Propozycja UI (skrót)

Po dopasowaniu transakcji:
Wykryto nadpłatę: 200,00 PLN
[ Zapisz jako saldo kontrahenta ] (domyślne)
[ Rozlicz na inne faktury ]
[ Zaplanuj zwrot ]
[ Inne / korekta ]

yaml
Copy code

Domyślna sugestia:
- jeśli są inne faktury → „Rozlicz na inne”
- jeśli brak → „Saldo kontrahenta”

---

## 8. Spójność z architekturą Księgal

Model nadpłat:
- nie łamie istniejącego systemu decyzji,
- nie wprowadza skrótów księgowych,
- pozwala na przyszłe:
  - rozliczenia częściowe,
  - różnice kursowe,
  - masowe importy bankowe,
  - automatyzację.

---

## 9. Podsumowanie

Nadpłata nie jest problemem — jest **zdarzeniem księgowym**.

System:
- nie zgaduje,
- nie „naprawia po cichu”,
- wymusza świadomą decyzję.

To zapewnia:
- zgodność,
- przejrzystość,
- skalowalność systemu.