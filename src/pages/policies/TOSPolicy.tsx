import React from 'react';

const TOSPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Regulamin Serwisu ksiegai.pl</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">1. Informacje o Usługodawcy</h2>
          <p className="text-neutral-300">
            Właścicielem i operatorem serwisu ksiegai.pl jest ALPINALD WIKTOR BRZEZIŃSKI, GAJÓWKA-KOLONIA 23, 99-205 GAJÓWKA-KOLONIA, NIP: 7322212639, e-mail: contact@ksiegai.pl.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">2. Definicje</h2>
          <ul className="list-disc pl-6 text-neutral-300">
            <li>Serwis - platforma ksiegai.pl</li>
            <li>Użytkownik - osoba fizyczna lub prawna korzystająca z Serwisu</li>
            <li>Usługa - usługi świadczone przez Serwis w zakresie księgowości, generowania faktur, JPK, KSeF</li>
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
          <h2 className="text-2xl font-semibold mb-4 text-white">5. Usługi premium i płatności</h2>
          <p className="text-neutral-300">
            Serwis oferuje usługi premium, które wymagają uiszczenia opłaty. Płatności obsługiwane są przez Stripe (Stripe Payments Europe, Ltd.), a także przez systemy BLIK oraz Przelewy24. Szczegóły dotyczące usług premium dostępne są w cenniku na stronie Serwisu.
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
            Wszelkie prawa do Serwisu, w tym prawa autorskie, znaki towarowe i inne prawa własności intelektualnej, należą do ALPINALD WIKTOR BRZEZIŃSKI.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">8. Reklamacje i kontakt</h2>
          <p className="text-neutral-300">
            Reklamacje dotyczące działania Serwisu można zgłaszać na adres e-mail: contact@ksiegai.pl. Reklamacje będą rozpatrywane w terminie 14 dni.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">9. Zmiany regulaminu</h2>
          <p className="text-neutral-300">
            ALPINALD WIKTOR BRZEZIŃSKI zastrzega sobie prawo do zmiany regulaminu w każdym czasie. O zmianach Użytkownik będzie informowany z wyprzedzeniem.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">10. Postanowienia końcowe</h2>
          <p className="text-neutral-300">
            W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają przepisy prawa polskiego oraz prawa Unii Europejskiej, w szczególności dotyczące świadczenia usług drogą elektroniczną i ochrony konsumentów.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TOSPolicy;