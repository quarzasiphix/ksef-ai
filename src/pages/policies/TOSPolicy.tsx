import React from 'react';

const TOSPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Regulamin Serwisu</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">1. Postanowienia ogólne</h2>
          <p className="text-neutral-300">
            Niniejszy regulamin określa zasady korzystania z serwisu Ai Faktura oraz świadczenia usług drogą elektroniczną przez Ai Faktura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">2. Definicje</h2>
          <ul className="list-disc pl-6 text-neutral-300">
            <li>Serwis - platforma KsiegaI dostępna pod adresem ksiegai.pl</li>
            <li>Użytkownik - osoba fizyczna lub prawna korzystająca z Serwisu</li>
            <li>Usługa - usługi świadczone przez Serwis w zakresie zarządzania fakturami i dokumentami</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">3. Warunki korzystania z Serwisu</h2>
          <p className="text-neutral-300">
            Korzystanie z Serwisu wymaga:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Posiadania konta w Serwisie</li>
            <li>Akceptacji niniejszego regulaminu</li>
            <li>Posiadania urządzenia z dostępem do Internetu</li>
            <li>Posiadania aktywnej przeglądarki internetowej</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">4. Rejestracja i konto użytkownika</h2>
          <p className="text-neutral-300">
            Aby korzystać z Serwisu, Użytkownik musi:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Wypełnić formularz rejestracyjny</li>
            <li>Podając prawdziwe dane</li>
            <li>Akceptując regulamin i politykę prywatności</li>
            <li>Potwierdzić rejestrację poprzez link aktywacyjny</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">5. Usługi premium</h2>
          <p className="text-neutral-300">
            Serwis oferuje usługi premium, które wymagają uiszczenia opłaty. Szczegóły dotyczące usług premium dostępne są w cenniku na stronie Serwisu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">6. Odpowiedzialność</h2>
          <p className="text-neutral-300">
            Użytkownik ponosi odpowiedzialność za:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Prawdziwość podanych danych</li>
            <li>Zachowanie poufności hasła</li>
            <li>Wszystkie działania wykonane z wykorzystaniem jego konta</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">7. Ochrona własności intelektualnej</h2>
          <p className="text-neutral-300">
            Wszelkie prawa do Serwisu, w tym prawa autorskie, znaki towarowe i inne prawa własności intelektualnej, należą do Ai Faktura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">8. Zmiany regulaminu</h2>
          <p className="text-neutral-300">
            Ai Faktura zastrzega sobie prawo do zmiany regulaminu w każdym czasie. O zmianach Użytkownik będzie informowany z wyprzedzeniem.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">9. Postanowienia końcowe</h2>
          <p className="text-neutral-300">
            W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa polskiego.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TOSPolicy;