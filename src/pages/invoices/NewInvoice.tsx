
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Users,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import CustomerForm from "@/components/customers/CustomerForm";
import ProductForm from "@/components/products/ProductForm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  BusinessProfile,
  Customer,
  Product,
  Invoice,
  InvoiceItem,
  InvoiceType,
  PaymentMethod,
} from "@/types";

import { getBusinessProfiles, getDefaultBusinessProfile } from "@/integrations/supabase/repositories/businessProfileRepository";
import { getCustomers } from "@/integrations/supabase/repositories/customerRepository";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import { saveInvoice } from "@/integrations/supabase/repositories/invoiceRepository";
import { cn } from "@/lib/utils";

const invoiceFormSchema = z.object({
  number: z.string().min(1, "Numer faktury jest wymagany"),
  type: z.nativeEnum(InvoiceType),
  issueDate: z.date(),
  dueDate: z.date(),
  sellDate: z.date(),
  businessProfileId: z.string().min(1, "Wybierz profil firmy"),
  customerId: z.string().min(1, "Wybierz klienta"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  isPaid: z.boolean().default(false),
  comments: z.string().optional(),
});

const NewInvoice = () => {
  const navigate = useNavigate();

  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isSelectProductOpen, setIsSelectProductOpen] = useState(false);

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: generateInvoiceNumber(),
      type: InvoiceType.SALES,
      issueDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
      sellDate: new Date(),
      businessProfileId: "",
      customerId: "",
      paymentMethod: PaymentMethod.TRANSFER,
      isPaid: false,
      comments: "",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profilesData, customersData, productsData, defaultProfile] = await Promise.all([
          getBusinessProfiles(),
          getCustomers(),
          getProducts(),
          getDefaultBusinessProfile(),
        ]);
        
        setBusinessProfiles(profilesData);
        setCustomers(customersData);
        setProducts(productsData);
        
        if (defaultProfile) {
          form.setValue("businessProfileId", defaultProfile.id);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Wystąpił błąd podczas ładowania danych");
      }
    };

    loadData();
  }, [form]);

  function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `FV/${year}/${month}/001`;
  }

  const handleAddItem = (product: Product) => {
    const newItem: InvoiceItem = {
      id: uuid(),
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.unitPrice,
      vatRate: product.vatRate,
      unit: product.unit,
      totalNetValue: product.unitPrice,
      totalGrossValue: product.vatRate === -1
        ? product.unitPrice
        : product.unitPrice * (1 + product.vatRate / 100),
      totalVatValue: product.vatRate === -1
        ? 0
        : product.unitPrice * (product.vatRate / 100),
    };

    setItems((prevItems) => [...prevItems, newItem]);
    setIsSelectProductOpen(false);
  };

  const handleAddEmptyItem = () => {
    const newItem: InvoiceItem = {
      id: uuid(),
      name: "",
      quantity: 1,
      unitPrice: 0,
      vatRate: 23,
      unit: "szt.",
      totalNetValue: 0,
      totalGrossValue: 0,
      totalVatValue: 0,
    };
    setItems((prevItems) => [...prevItems, newItem]);
  };

  const handleProductCreated = (product: Product) => {
    setProducts((prevProducts) => [...prevProducts, product]);
    handleAddItem(product);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers((prevCustomers) => [...prevCustomers, customer]);
    form.setValue("customerId", customer.id);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;

        const updatedItem = { ...item, [field]: value };
        
        // Recalculate totals
        if (field === "quantity" || field === "unitPrice" || field === "vatRate") {
          const quantity = field === "quantity" ? value : updatedItem.quantity;
          const unitPrice = field === "unitPrice" ? value : updatedItem.unitPrice;
          const vatRate = field === "vatRate" ? value : updatedItem.vatRate;
          
          const totalNetValue = quantity * unitPrice;
          const totalVatValue = vatRate === -1 ? 0 : totalNetValue * (vatRate / 100);
          const totalGrossValue = totalNetValue + totalVatValue;
          
          return {
            ...updatedItem,
            totalNetValue,
            totalVatValue,
            totalGrossValue,
          };
        }
        
        return updatedItem;
      })
    );
  };

  const getTotals = () => {
    const totalNetValue = items.reduce((sum, item) => sum + item.totalNetValue, 0);
    const totalVatValue = items.reduce((sum, item) => sum + item.totalVatValue, 0);
    const totalGrossValue = items.reduce((sum, item) => sum + item.totalGrossValue, 0);
    
    return { totalNetValue, totalVatValue, totalGrossValue };
  };

  const onSubmit = async (values: z.infer<typeof invoiceFormSchema>) => {
    try {
      if (items.length === 0) {
        toast.error("Dodaj co najmniej jeden produkt do faktury");
        return;
      }

      // Validate all items have names
      const invalidItems = items.filter(item => !item.name.trim());
      if (invalidItems.length > 0) {
        toast.error("Wszystkie pozycje na fakturze muszą mieć nazwy");
        return;
      }

      const totals = getTotals();
      
      const invoice: Invoice = {
        ...values,
        items,
        ...totals,
        ksef: { status: 'none' }
      };

      await saveInvoice(invoice);
      toast.success("Faktura została utworzona");
      navigate("/invoices");
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Wystąpił błąd podczas tworzenia faktury");
    }
  };

  return (
    <div className="pb-20">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button variant="outline" size="icon" asChild>
          <a href="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>
        <h1 className="text-2xl font-bold">Nowa Faktura</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Dane sprzedawcy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profil firmy</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz profil firmy" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                              {profile.isDefault && " (Domyślny)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Dane nabywcy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Klient</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz klienta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-8"
                    onClick={() => setIsCustomerFormOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nowy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Szczegóły faktury</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numer faktury</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ dokumentu</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value as InvoiceType)}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sales">Faktura sprzedaży</SelectItem>
                          <SelectItem value="receipt">Rachunek</SelectItem>
                          <SelectItem value="proforma">Faktura proforma</SelectItem>
                          <SelectItem value="correction">Faktura korygująca</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data wystawienia</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Wybierz datę</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={pl}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sellDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data sprzedaży</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Wybierz datę</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={pl}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Termin płatności</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd.MM.yyyy")
                              ) : (
                                <span>Wybierz datę</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={pl}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metoda płatności</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(value as PaymentMethod)}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="transfer" id="transfer" />
                            <label htmlFor="transfer">Przelew</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cash" id="cash" />
                            <label htmlFor="cash">Gotówka</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="card" id="card" />
                            <label htmlFor="card">Karta</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="other" />
                            <label htmlFor="other">Inna</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Opłacona</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pozycje faktury</CardTitle>
              <CardDescription>Dodaj produkty do faktury</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead className="w-[100px]">Ilość</TableHead>
                      <TableHead className="w-[100px]">J.m.</TableHead>
                      <TableHead className="w-[120px]">Cena netto</TableHead>
                      <TableHead className="w-[80px]">VAT</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateItem(item.id, "name", e.target.value)
                            }
                            placeholder="Nazwa produktu"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            step="0.001"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit}
                            onValueChange={(value) =>
                              updateItem(item.id, "unit", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={item.unit} />
                            </SelectTrigger>
                            <SelectContent>
                              {["szt.", "godz.", "usł.", "kg", "m", "m²", "m³", "l", "komplet"].map(
                                (unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            step="0.01"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.vatRate.toString()}
                            onValueChange={(value) =>
                              updateItem(
                                item.id,
                                "vatRate",
                                parseInt(value)
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="23">23%</SelectItem>
                              <SelectItem value="8">8%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="-1">zw.</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.totalNetValue.toFixed(2)} zł
                        </TableCell>
                        <TableCell className="text-right">
                          {item.totalGrossValue.toFixed(2)} zł
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-4 text-muted-foreground"
                        >
                          Brak pozycji na fakturze
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2 mt-4">
                <Sheet
                  open={isSelectProductOpen}
                  onOpenChange={setIsSelectProductOpen}
                >
                  <SheetTrigger asChild>
                    <Button type="button" variant="outline">
                      <Plus className="mr-2 h-4 w-4" /> Z produktów
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Wybierz produkt</SheetTitle>
                    </SheetHeader>
                    <div className="py-4">
                      {products.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            Nie masz jeszcze żadnych produktów
                          </p>
                          <Button
                            onClick={() => {
                              setIsSelectProductOpen(false);
                              setIsProductFormOpen(true);
                            }}
                            className="mt-4"
                          >
                            Dodaj pierwszy produkt
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                          {products.map((product) => (
                            <Card
                              key={product.id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleAddItem(product)}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-medium">{product.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {product.unitPrice.toFixed(2)} zł netto / {product.unit}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm">
                                      VAT: {product.vatRate === -1 ? "zw." : `${product.vatRate}%`}
                                    </p>
                                    <p className="font-medium">
                                      {(product.vatRate === -1
                                        ? product.unitPrice
                                        : product.unitPrice * (1 + product.vatRate / 100)
                                      ).toFixed(2)} zł
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                      <div className="mt-6 flex flex-col gap-2">
                        <Button
                          onClick={() => {
                            setIsSelectProductOpen(false);
                            setIsProductFormOpen(true);
                          }}
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Nowy produkt
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddEmptyItem}
                >
                  <Plus className="mr-2 h-4 w-4" /> Pusta pozycja
                </Button>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/50">
              <div className="ml-auto mt-2 text-right">
                <div className="space-y-1">
                  <div className="flex justify-end gap-4">
                    <span className="text-muted-foreground">Suma netto:</span>
                    <span>{getTotals().totalNetValue.toFixed(2)} zł</span>
                  </div>
                  <div className="flex justify-end gap-4">
                    <span className="text-muted-foreground">Suma VAT:</span>
                    <span>{getTotals().totalVatValue.toFixed(2)} zł</span>
                  </div>
                  <Separator />
                  <div className="flex justify-end gap-4 font-medium text-lg">
                    <span>Razem brutto:</span>
                    <span>{getTotals().totalGrossValue.toFixed(2)} zł</span>
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uwagi</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dodatkowe informacje (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Np. informacje o płatności, termin realizacji, itp."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end gap-2 md:static md:border-0 md:p-0 md:bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/invoices")}
            >
              Anuluj
            </Button>
            <Button type="submit">Utwórz fakturę</Button>
          </div>
        </form>
      </Form>

      {/* Customer Form Dialog */}
      <CustomerForm
        isOpen={isCustomerFormOpen}
        onClose={() => setIsCustomerFormOpen(false)}
        onSuccess={handleCustomerCreated}
      />

      {/* Product Form Dialog */}
      <ProductForm
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        onSuccess={handleProductCreated}
      />
    </div>
  );
};

export default NewInvoice;
