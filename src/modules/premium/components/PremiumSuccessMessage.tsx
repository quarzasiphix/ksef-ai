import React from 'react';
import { Star, Building2, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { useNavigate } from 'react-router-dom';

interface PremiumSuccessMessageProps {
  isOpen: boolean;
  onClose: () => void;
  premiumFeatures: string[];
}

const PremiumSuccessMessage: React.FC<PremiumSuccessMessageProps> = ({ isOpen, onClose, premiumFeatures }) => {
  const navigate = useNavigate();

  const handleNavigateToNewProfile = () => {
    navigate('/settings/business-profiles/new');
    onClose(); // Close modal after navigation
  };

  const handleNavigateToKsef = () => {
    // Assuming a KSeF route exists or will exist
    // Replace '/ksef' with the actual route
    navigate('/accounting');
    onClose(); // Close modal after navigation
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div // This is the main container for backdrop and modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop overlay - Solid black */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 bg-black"
            onClick={onClose} // Allow closing by clicking outside
          ></motion.div>

          <motion.div // This is the success message content container
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-white p-8 rounded-2xl shadow-2xl relative overflow-hidden border-2 border-amber-300 max-w-md w-full pointer-events-auto"
          >
             {/* Close button */}
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={onClose}
             >
                X {/* Use a simple X for now, can replace with Lucide icon later */}
             </Button>

            {/* Sparkle effect (more refined) */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-70">
              <motion.div
                initial={{ x: '10%', y: '20%', opacity: 0 }}
                animate={{ x: '90%', y: '80%', opacity: [0, 1, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute size-2 bg-white rounded-full"
              ></motion.div>
              <motion.div
                initial={{ x: '80%', y: '10%', opacity: 0 }}
                animate={{ x: '10%', y: '90%', opacity: [0, 1, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1.5 }}
                className="absolute size-2 bg-white rounded-full"
              ></motion.div>
               <motion.div
                initial={{ x: '50%', y: '50%', opacity: 0 }}
                animate={{ x: '50%', y: '50%', opacity: [0, 1, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 3 }}
                className="absolute size-2 bg-white rounded-full"
              ></motion.div>
            </div>

            <h2 className="text-3xl font-extrabold mb-4 flex items-center text-shadow-md">
              <motion.span
                 initial={{ rotate: 0, scale: 1 }}
                 animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1, 1] }}
                 transition={{ duration: 1, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
                 className="mr-3"
              >
                  <Star className="h-8 w-8 text-white" fill="currentColor" />
              </motion.span>
              <motion.span
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.7 }}
              >
                 Dziękujemy za zakup Premium!
              </motion.span>
            </h2>
            <motion.p
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.9 }}
               className="mb-6 text-lg"
            >
              Twoja subskrypcja jest teraz aktywna. Oto co zyskujesz:
            </motion.p>
            <ul className="list-none space-y-3 mb-8">
              {premiumFeatures.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 + index * 0.1 }}
                  className="flex items-center"
                >
                   <Star className="mr-2 h-5 w-5 text-amber-200 flex-shrink-0" fill="currentColor" />
                   <span>{feature}</span>
                </motion.li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.8 }}
              >
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto bg-white text-amber-600 hover:bg-amber-100"
                  onClick={handleNavigateToNewProfile}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Dodaj nowy profil firmowy
                </Button>
              </motion.div>
               <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 2.0 }}
              >
                <Button
                   variant="secondary"
                   className="w-full sm:w-auto bg-white text-amber-600 hover:bg-amber-100"
                   onClick={handleNavigateToKsef}
                >
                   <Settings className="mr-2 h-4 w-4" />
                   Przejdź do Księgowania
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumSuccessMessage; 