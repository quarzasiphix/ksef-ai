
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
import CustomerList from "./pages/customers/CustomerList";
import CustomerDetail from "./pages/customers/CustomerDetail";
import ProductList from "./pages/products/ProductList";

// Create these new pages
import NewCustomer from "./pages/customers/NewCustomer";
import EditCustomer from "./pages/customers/EditCustomer";
import NewProduct from "./pages/products/NewProduct";
import EditProduct from "./pages/products/EditProduct";
import ProductDetail from "./pages/products/ProductDetail";

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
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="customers/new" element={<NewCustomer />} />
            <Route path="customers/edit/:id" element={<EditCustomer />} />
            
            {/* Product routes */}
            <Route path="products" element={<ProductList />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="products/new" element={<NewProduct />} />
            <Route path="products/edit/:id" element={<EditProduct />} />
            
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
