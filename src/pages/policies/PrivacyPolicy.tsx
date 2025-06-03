import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Polityka Prywatności</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">1. Informacje ogólne</h2>
          <p className="text-neutral-300">
            Niniejsza polityka prywatności określa zasady przetwarzania i ochrony danych osobowych przekazanych przez Użytkowników w związku z korzystaniem przez nich z serwisu Ai Faktura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">2. Administrator Danych</h2>
          <p className="text-neutral-300">
            Administratorem danych osobowych zawartych w serwisie jest Ai Faktura z siedzibą w Polsce.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">3. Cel zbierania danych</h2>
          <p className="text-neutral-300">
            Dane osobowe zbierane są w celu:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Świadczenia usług drogą elektroniczną</li>
            <li>Obsługi procesu rejestracji i logowania</li>
            <li>Obsługi systemu faktur i dokumentów</li>
            <li>Komunikacji z Użytkownikami</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">4. Rodzaj przetwarzanych danych</h2>
          <p className="text-neutral-300">
            Przetwarzamy następujące dane osobowe:
          </p>
          <ul className="list-disc pl-6 mt-2 text-neutral-300">
            <li>Adres e-mail</li>
            <li>Dane firmowe (w przypadku kont firmowych)</li>
            <li>Dane kontaktowe</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">5. Okres przechowywania danych</h2>
          <p className="text-neutral-300">
            Dane osobowe są przechowywane przez okres niezbędny do realizacji celów, w których zostały zebrane, zgodnie z obowiązującymi przepisami prawa.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">6. Prawa Użytkownika</h2>
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
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">7. Bezpieczeństwo danych</h2>
          <p className="text-neutral-300">
            Zapewniamy odpowiednie środki techniczne i organizacyjne, aby chronić dane osobowe przed ich przypadkowym lub niezgodnym z prawem zniszczeniem, utratą, zmianą, nieuprawnionym ujawnieniem lub nieuprawnionym dostępem.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">8. Kontakt</h2>
          <p className="text-neutral-300">
            W sprawach związanych z ochroną danych osobowych można kontaktować się z nami pod adresem e-mail: privacy@ksiegai.pl
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;