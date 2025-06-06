import React from 'react';

const RefundsPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Polityka Zwrotów</h1>
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">1. Informacje o Usługodawcy</h2>
          <p className="text-neutral-300">
            Właścicielem i operatorem serwisu ksiegai.pl jest ALPINALD WIKTOR BRZEZIŃSKI, GAJÓWKA-KOLONIA 23, 99-205 GAJÓWKA-KOLONIA, NIP: 7322212639, e-mail: contact@ksiegai.pl.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">2. Prawo do odstąpienia od umowy</h2>
          <p className="text-neutral-300">
            Użytkownik ma prawo do odstąpienia od umowy w ciągu 7 dni od zakupu, pod warunkiem, że nie rozpoczął korzystania z usługi premium. Po rozpoczęciu korzystania z usługi (logowanie, generowanie dokumentów) zwrot nie przysługuje, zgodnie z przepisami dotyczącymi usług cyfrowych.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">3. Wyjątki od prawa odstąpienia</h2>
          <p className="text-neutral-300">
            Prawo do zwrotu nie przysługuje, jeśli Użytkownik rozpoczął korzystanie z usługi premium przed upływem 7 dni od zakupu lub jeśli usługa została w pełni wykonana za zgodą Użytkownika.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">4. Procedura zwrotu</h2>
          <p className="text-neutral-300">
            Aby uzyskać zwrot, Użytkownik powinien skontaktować się z nami na adres e-mail: contact@ksiegai.pl, podając dane niezbędne do identyfikacji płatności oraz powód żądania zwrotu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">5. Terminy zwrotu</h2>
          <p className="text-neutral-300">
            Zwrot środków zostanie dokonany w terminie do 14 dni od pozytywnego rozpatrzenia wniosku. Środki zostaną zwrócone tą samą metodą płatności, którą dokonano płatności (Stripe, BLIK, Przelewy24).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">6. Reklamacje</h2>
          <p className="text-neutral-300">
            Reklamacje dotyczące zwrotów rozpatrywane są w terminie 14 dni od ich otrzymania. O rozstrzygnięciu reklamacji Użytkownik zostanie powiadomiony e-mailowo.
          </p>
        </section>
      </div>
    </div>
  );
};

export default RefundsPolicy;