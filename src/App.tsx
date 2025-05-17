
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";

import Layout from "./components/layout/Layout";
import GlobalDataLoader from "./components/layout/GlobalDataLoader";
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
import NewCustomer from "./pages/customers/NewCustomer";
import EditCustomer from "./pages/customers/EditCustomer";
import NewProduct from "./pages/products/NewProduct";
import EditProduct from "./pages/products/EditProduct";
import ProductDetail from "./pages/products/ProductDetail";
import IncomeList from "./pages/income/IncomeList";
import DocumentSettings from "./pages/settings/DocumentSettings";

// Set up QueryClient with global default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Disable refetch on window focus
      refetchOnMount: false, // Disable refetch when component mounts
      refetchOnReconnect: false, // Disable refetch on reconnect
      retry: 1, // Only retry failed requests once
      staleTime: Infinity, // Data never goes stale automatically
      gcTime: Infinity // Cache never expires automatically
    },
  },
});

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalDataLoader /> {/* Add our global data loader */}
          <Routes>
            <Route path="/" element={<Layout />}>
            {/* Main routes */}
            <Route index element={<Dashboard />} />
            
            {/* Income routes (replaces Invoice list) */}
            <Route path="income" element={<IncomeList />} />
            
            {/* Keep invoice detail/edit/create routes as they are */}
            <Route path="invoices/new" element={<NewInvoice />} />
            <Route path="invoices/edit/:id" element={<EditInvoice />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            
            {/* Customer routes */}
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/new" element={<NewCustomer />} />
            <Route path="customers/edit/:id" element={<EditCustomer />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            
            {/* Product routes */}
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<NewProduct />} />
            <Route path="products/edit/:id" element={<EditProduct />} />
            <Route path="products/:id" element={<ProductDetail />} />
            
            {/* Settings routes */}
            <Route path="settings" element={<BusinessProfiles />} />
            <Route path="settings/business-profiles/new" element={<NewBusinessProfile />} />
            <Route path="settings/business-profiles/:id" element={<EditBusinessProfile />} />
            <Route path="settings/documents" element={<DocumentSettings />} />
            
            {/* Legacy route for backward compatibility */}
            <Route path="invoices" element={<IncomeList />} />
            
            {/* Catch-all for any other routes */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
