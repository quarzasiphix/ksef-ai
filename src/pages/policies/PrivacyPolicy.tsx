import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Polityka Prywatności</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Informacje ogólne</h2>
          <p>
            Niniejsza polityka prywatności określa zasady przetwarzania i ochrony danych osobowych przekazanych przez Użytkowników w związku z korzystaniem przez nich z serwisu Ai Faktura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Administrator Danych</h2>
          <p>
            Administratorem danych osobowych zawartych w serwisie jest Ai Faktura z siedzibą w Polsce.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Cel zbierania danych</h2>
          <p>
            Dane osobowe zbierane są w celu:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Świadczenia usług drogą elektroniczną</li>
            <li>Obsługi procesu rejestracji i logowania</li>
            <li>Obsługi systemu faktur i dokumentów</li>
            <li>Komunikacji z Użytkownikami</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Rodzaj przetwarzanych danych</h2>
          <p>
            Przetwarzamy następujące dane osobowe:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Adres e-mail</li>
            <li>Dane firmowe (w przypadku kont firmowych)</li>
            <li>Dane kontaktowe</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Okres przechowywania danych</h2>
          <p>
            Dane osobowe są przechowywane przez okres niezbędny do realizacji celów, w których zostały zebrane, zgodnie z obowiązującymi przepisami prawa.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Prawa Użytkownika</h2>
          <p>
            Użytkownik ma prawo do:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Dostępu do swoich danych</li>
            <li>Sprostowania danych</li>
            <li>Usunięcia danych</li>
            <li>Ograniczenia przetwarzania</li>
            <li>Przenoszenia danych</li>
            <li>Sprzeciwu wobec przetwarzania</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Bezpieczeństwo danych</h2>
          <p>
            Zapewniamy odpowiednie środki techniczne i organizacyjne, aby chronić dane osobowe przed ich przypadkowym lub niezgodnym z prawem zniszczeniem, utratą, zmianą, nieuprawnionym ujawnieniem lub nieuprawnionym dostępem.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Kontakt</h2>
          <p>
            W sprawach związanych z ochroną danych osobowych można kontaktować się z nami pod adresem e-mail: privacy@aifaktura.pl
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;