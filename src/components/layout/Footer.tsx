import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-neutral-900 border-t border-neutral-800 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-neutral-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Ai Faktura. Wszelkie prawa zastrzeżone.
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/policies/privacy" className="text-neutral-400 hover:text-white text-sm">
              Polityka Prywatności
            </Link>
            <Link to="/policies/tos" className="text-neutral-400 hover:text-white text-sm">
              Regulamin
            </Link>
            <Link to="/policies/refunds" className="text-neutral-400 hover:text-white text-sm">
              Polityka Zwrotów
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 