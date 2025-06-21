import React from "react";
import BankAccountsSection from "@/components/bank/BankAccountsSection";

const BankAccounts: React.FC = () => (
  <div className="min-h-screen bg-background py-8">
    <div className="container mx-auto">
      <BankAccountsSection />
    </div>
  </div>
);

export default BankAccounts; 