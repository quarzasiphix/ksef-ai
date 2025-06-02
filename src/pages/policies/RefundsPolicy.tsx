import React from 'react';

const RefundsPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Polityka Zwrotów</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Postanowienia ogólne</h2>
          <p>
            Niniejsza polityka zwrotów określa zasady i procedury związane ze zwrotami środków za usługi premium świadczone przez Ai Faktura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Prawo do odstąpienia od umowy</h2>
          <p>
            Użytkownik ma prawo do odstąpienia od umowy w ciągu 14 dni od jej zawarcia bez podawania przyczyny. Odstąpienie od umowy nie wymaga zachowania szczególnej formy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Wyjątki od prawa odstąpienia</h2>
          <p>
            Prawo odstąpienia nie przysługuje w przypadku:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Rozpoczęcia korzystania z usługi premium przed upływem terminu do odstąpienia</li>
            <li>Usług świadczonych jednorazowo</li>
            <li>Usług, których wykonanie rozpoczęło się za wyraźną zgodą Użytkownika</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Procedura zwrotu</h2>
          <p>
            Aby dokonać zwrotu, Użytkownik powinien:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Złożyć wniosek o zwrot poprzez formularz kontaktowy</li>
            <li>Podając dane niezbędne do identyfikacji płatności</li>
            <li>Określić przyczynę zwrotu</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Terminy zwrotu</h2>
          <p>
            Zwrot środków zostanie dokonany w terminie 14 dni od otrzymania wniosku o zwrot. Środki zostaną zwrócone tą samą metodą płatności, którą dokonano płatności.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Częściowe zwroty</h2>
          <p>
            W przypadku częściowego korzystania z usługi premium, zwrotowi podlega proporcjonalna część opłaty, pomniejszona o koszty już świadczonych usług.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Kontakt w sprawie zwrotów</h2>
          <p>
            W sprawach związanych ze zwrotami można kontaktować się z nami:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Email: refunds@aifaktura.pl</li>
            <li>Telefon: +48 XXX XXX XXX</li>
            <li>Formularz kontaktowy na stronie</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Reklamacje</h2>
          <p>
            Reklamacje dotyczące zwrotów rozpatrywane są w terminie 14 dni od ich otrzymania. O rozstrzygnięciu reklamacji Użytkownik zostanie powiadomiony w sposób wybrany przy składaniu reklamacji.
          </p>
        </section>
      </div>
    </div>
  );
};

export default RefundsPolicy;