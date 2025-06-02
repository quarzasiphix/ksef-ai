import React from 'react';

const TOSPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Regulamin Serwisu</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Postanowienia ogólne</h2>
          <p>
            Niniejszy regulamin określa zasady korzystania z serwisu Ai Faktura oraz świadczenia usług drogą elektroniczną przez Ai Faktura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Definicje</h2>
          <ul className="list-disc pl-6">
            <li>Serwis - platforma Ai Faktura dostępna pod adresem aifaktura.pl</li>
            <li>Użytkownik - osoba fizyczna lub prawna korzystająca z Serwisu</li>
            <li>Usługa - usługi świadczone przez Serwis w zakresie zarządzania fakturami i dokumentami</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Warunki korzystania z Serwisu</h2>
          <p>
            Korzystanie z Serwisu wymaga:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Posiadania konta w Serwisie</li>
            <li>Akceptacji niniejszego regulaminu</li>
            <li>Posiadania urządzenia z dostępem do Internetu</li>
            <li>Posiadania aktywnej przeglądarki internetowej</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Rejestracja i konto użytkownika</h2>
          <p>
            Aby korzystać z Serwisu, Użytkownik musi:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Wypełnić formularz rejestracyjny</li>
            <li>Podając prawdziwe dane</li>
            <li>Akceptując regulamin i politykę prywatności</li>
            <li>Potwierdzić rejestrację poprzez link aktywacyjny</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Usługi premium</h2>
          <p>
            Serwis oferuje usługi premium, które wymagają uiszczenia opłaty. Szczegóły dotyczące usług premium dostępne są w cenniku na stronie Serwisu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Odpowiedzialność</h2>
          <p>
            Użytkownik ponosi odpowiedzialność za:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Prawdziwość podanych danych</li>
            <li>Zachowanie poufności hasła</li>
            <li>Wszystkie działania wykonane z wykorzystaniem jego konta</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Ochrona własności intelektualnej</h2>
          <p>
            Wszelkie prawa do Serwisu, w tym prawa autorskie, znaki towarowe i inne prawa własności intelektualnej, należą do Ai Faktura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Zmiany regulaminu</h2>
          <p>
            Ai Faktura zastrzega sobie prawo do zmiany regulaminu w każdym czasie. O zmianach Użytkownik będzie informowany z wyprzedzeniem.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Postanowienia końcowe</h2>
          <p>
            W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa polskiego.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TOSPolicy;