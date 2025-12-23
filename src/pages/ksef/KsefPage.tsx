
import React, { useState, useEffect } from 'react';
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { List, Plus, Upload } from "lucide-react";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { Customer } from '@/shared/types';
import RequirePremium from "@/components/auth/RequirePremium";

const KsefPage = () => {
  const [ksefEnabled, setKsefEnabled] = useState(false);
  const [ksefCertUploaded, setKsefCertUploaded] = useState(false);
  const [ksefInvoiceSyncEnabled, setKsefInvoiceSyncEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Mock check for KSeF status
    const storedKsefEnabled = localStorage.getItem('ksefEnabled') === 'true';
    setKsefEnabled(storedKsefEnabled);

    // Mock check for certificate upload
    const storedKsefCertUploaded = localStorage.getItem('ksefCertUploaded') === 'true';
    setKsefCertUploaded(storedKsefCertUploaded);

    // Mock check for invoice sync status
    const storedKsefInvoiceSyncEnabled = localStorage.getItem('ksefInvoiceSyncEnabled') === 'true';
    setKsefInvoiceSyncEnabled(storedKsefInvoiceSyncEnabled);
  }, []);

  const handleKsefEnable = () => {
    const newKsefEnabled = !ksefEnabled;
    setKsefEnabled(newKsefEnabled);
    localStorage.setItem('ksefEnabled', newKsefEnabled.toString());

    toast({
      title: newKsefEnabled ? "KSeF Włączony" : "KSeF Wyłączony",
      description: newKsefEnabled ? "Integracja z KSeF została włączona." : "Integracja z KSeF została wyłączona.",
    });
  };

  const handleCertUpload = () => {
    setKsefCertUploaded(true);
    localStorage.setItem('ksefCertUploaded', 'true');

    toast({
      title: "Certyfikat Wysłany",
      description: "Certyfikat KSeF został pomyślnie przesłany.",
    });
  };

  const handleInvoiceSyncEnable = () => {
    const newKsefInvoiceSyncEnabled = !ksefInvoiceSyncEnabled;
    setKsefInvoiceSyncEnabled(newKsefInvoiceSyncEnabled);
    localStorage.setItem('ksefInvoiceSyncEnabled', newKsefInvoiceSyncEnabled.toString());

    toast({
      title: newKsefInvoiceSyncEnabled ? "Synchronizacja Włączona" : "Synchronizacja Wyłączona",
      description: newKsefInvoiceSyncEnabled ? "Synchronizacja faktur z KSeF została włączona." : "Synchronizacja faktur z KSeF została wyłączona.",
    });
  };

  const mockCustomers: Customer[] = [
    {
      id: "1",
      user_id: "user-1",
      name: "ACME Corporation",
      address: "ul. Testowa 123",
      postalCode: "00-001",
      city: "Warszawa",
      customerType: 'odbiorca',
    },
    {
      id: "2",
      user_id: "user-2",
      name: "Beta Industries",
      address: "al. Przemysłowa 456",
      postalCode: "00-002",
      city: "Kraków",
      customerType: 'odbiorca',
    },
    {
      id: "3",
      user_id: "user-3",
      name: "Gamma Solutions",
      address: "pl. Rynkowa 789",
      postalCode: "00-003",
      city: "Gdańsk",
      customerType: 'odbiorca',
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Krajowy System e-Faktur (KSeF)</h1>
        <Badge variant="secondary">
          <List className="mr-2 h-4 w-4" />
          Wersja Premium
        </Badge>
      </div>

      <Separator className="mb-4" />

      {!ksefEnabled ? (
        <RequirePremium feature="Integracja z KSeF">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Integracja z KSeF</CardTitle>
              <CardDescription>
                Włącz integrację z Krajowym Systemem e-Faktur, aby wysyłać i odbierać faktury w KSeF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleKsefEnable}>
                Włącz KSeF
              </Button>
            </CardContent>
          </Card>
        </RequirePremium>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Certyfikat KSeF</CardTitle>
              <CardDescription>
                Prześlij certyfikat KSeF, aby autoryzować swoją firmę w systemie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!ksefCertUploaded ? (
                <>
                  <Label htmlFor="cert-upload">
                    <div className="flex items-center justify-center w-full py-4 bg-muted rounded-md cursor-pointer hover:bg-accent">
                      <Upload className="mr-2 h-4 w-4" />
                      Wybierz certyfikat z dysku
                    </div>
                  </Label>
                  <Input type="file" id="cert-upload" className="hidden" onChange={handleCertUpload} />
                </>
              ) : (
                <Badge variant="outline">Certyfikat przesłany</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Synchronizacja Faktur</CardTitle>
              <CardDescription>
                Włącz automatyczną synchronizację faktur z KSeF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleInvoiceSyncEnable}>
                {ksefInvoiceSyncEnabled ? "Wyłącz Synchronizację" : "Włącz Synchronizację"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Lista Klientów (KSeF)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockCustomers.map((customer) => (
            <Card key={customer.id}>
              <CardHeader>
                <CardTitle>{customer.name}</CardTitle>
                <CardDescription>
                  {customer.address}, {customer.postalCode} {customer.city}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>NIP: {customer.taxId || 'Brak'}</p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj fakturę
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default KsefPage;
