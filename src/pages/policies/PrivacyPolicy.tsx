import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Polityka Prywatności</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">1. Informacje ogólne</h2>
          <p className="text-neutral-300">
            Niniejsza polityka prywatności określa zasady przetwarzania i ochrony danych osobowych przekazanych przez Użytkowników w związku z korzystaniem z serwisu ksiegai.pl, prowadzonego przez ALPINALD WIKTOR BRZEZIŃSKI, GAJÓWKA-KOLONIA 23, 99-205 GAJÓWKA-KOLONIA, NIP: 7322212639.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">2. Administrator Danych</h2>
          <p className="text-neutral-300">
            Administratorem danych osobowych jest ALPINALD WIKTOR BRZEZIŃSKI, GAJÓWKA-KOLONIA 23, 99-205 GAJÓWKA-KOLONIA, NIP: 7322212639, e-mail: contact@ksiegai.pl.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">3. Cel zbierania danych</h2>
          <p className="text-neutral-300">
            Dane osobowe zbierane są w celu:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Świadczenia usług drogą elektroniczną (księgowość, generowanie faktur, JPK, KSeF)</li>
            <li>Obsługi procesu rejestracji i logowania</li>
            <li>Obsługi systemu płatności (Stripe)</li>
            <li>Komunikacji z Użytkownikami</li>
            <li>Spełnienia obowiązków prawnych</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">4. Rodzaj przetwarzanych danych</h2>
          <p className="text-neutral-300">
            Przetwarzamy następujące dane osobowe:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Adres e-mail</li>
            <li>Dane firmowe (NIP, nazwa, adres)</li>
            <li>Dane kontaktowe</li>
            <li>Dane płatnicze (przetwarzane przez Stripe, BLIK, Przelewy24)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">5. Przetwarzanie danych przez podmioty trzecie</h2>
          <p className="text-neutral-300">
            Dane płatnicze są przetwarzane przez operatorów płatności Stripe (Stripe Payments Europe, Ltd.), BLIK oraz Przelewy24, zgodnie z ich politykami prywatności. Dane mogą być również przekazywane podmiotom wspierającym obsługę techniczną serwisu, wyłącznie w zakresie niezbędnym do realizacji usług.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">6. Okres przechowywania danych</h2>
          <p className="text-neutral-300">
            Dane osobowe są przechowywane przez okres niezbędny do realizacji celów, w których zostały zebrane, oraz zgodnie z obowiązującymi przepisami prawa (w tym przepisami rachunkowymi i podatkowymi).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">7. Prawa Użytkownika</h2>
          <p className="text-neutral-300">
            Użytkownik ma prawo do:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Dostępu do swoich danych</li>
            <li>Sprostowania danych</li>
            <li>Usunięcia danych</li>
            <li>Ograniczenia przetwarzania</li>
            <li>Przenoszenia danych</li>
            <li>Sprzeciwu wobec przetwarzania</li>
            <li>Wniesienia skargi do Prezesa UODO</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">8. Bezpieczeństwo danych</h2>
          <p className="text-neutral-300">
            Zapewniamy odpowiednie środki techniczne i organizacyjne, aby chronić dane osobowe przed ich przypadkowym lub niezgodnym z prawem zniszczeniem, utratą, zmianą, nieuprawnionym ujawnieniem lub nieuprawnionym dostępem. Dane są przechowywane na serwerach zlokalizowanych w Unii Europejskiej.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">9. Przekazywanie danych poza EOG</h2>
          <p className="text-neutral-300">
            Dane osobowe mogą być przekazywane poza Europejski Obszar Gospodarczy wyłącznie w przypadkach przewidzianych prawem i z zapewnieniem odpowiedniego poziomu ochrony.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">10. Kontakt</h2>
          <p className="text-neutral-300">
            W sprawach związanych z ochroną danych osobowych można kontaktować się z nami pod adresem e-mail: contact@ksiegai.pl
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">11. Podstawa prawna</h2>
          <p className="text-neutral-300">
            Przetwarzanie danych odbywa się zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO/GDPR) oraz ustawą o ochronie danych osobowych i innymi obowiązującymi przepisami prawa polskiego i europejskiego.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;