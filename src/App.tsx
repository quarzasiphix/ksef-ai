
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import InvoiceList from "./pages/invoices/InvoiceList";
import InvoiceDetail from "./pages/invoices/InvoiceDetail";
import NewInvoice from "./pages/invoices/NewInvoice";
import EditInvoice from "./pages/invoices/EditInvoice";
import BusinessProfiles from "./pages/settings/BusinessProfiles";
import NewBusinessProfile from "./pages/settings/NewBusinessProfile";
import EditBusinessProfile from "./pages/settings/EditBusinessProfile";
import NotFound from "./pages/NotFound";

// Placeholder for future pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p>Ta strona jest w trakcie implementacji.</p>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Main routes */}
            <Route index element={<Dashboard />} />
            
            {/* Invoice routes */}
            <Route path="invoices" element={<InvoiceList />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="invoices/new" element={<NewInvoice />} />
            <Route path="invoices/edit/:id" element={<EditInvoice />} />
            
            {/* Customer routes */}
            <Route path="customers" element={<PlaceholderPage title="Klienci" />} />
            <Route path="customers/:id" element={<PlaceholderPage title="Szczegóły Klienta" />} />
            
            {/* Product routes */}
            <Route path="products" element={<PlaceholderPage title="Produkty" />} />
            
            {/* Settings routes */}
            <Route path="settings" element={<BusinessProfiles />} />
            <Route path="settings/business-profiles/new" element={<NewBusinessProfile />} />
            <Route path="settings/business-profiles/:id" element={<EditBusinessProfile />} />
            
            {/* Catch-all for any other routes */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
