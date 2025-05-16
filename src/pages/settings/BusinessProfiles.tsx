
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { mockBusinessProfiles } from "@/data/mockData";
import { BusinessProfile } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

const BusinessProfiles = () => {
  const [profiles, setProfiles] = useState<BusinessProfile[]>(mockBusinessProfiles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<BusinessProfile | null>(null);
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({});
  
  const handleOpenDialog = (profile?: BusinessProfile) => {
    if (profile) {
      setCurrentProfile(profile);
      setFormData({ ...profile });
    } else {
      setCurrentProfile(null);
      setFormData({});
    }
    setIsDialogOpen(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentProfile) {
      // Update existing profile
      setProfiles((prev) =>
        prev.map((p) => (p.id === currentProfile.id ? { ...p, ...formData } : p))
      );
    } else {
      // Add new profile
      const newProfile: BusinessProfile = {
        id: `bp${Date.now()}`,
        name: formData.name || "",
        taxId: formData.taxId || "",
        address: formData.address || "",
        postalCode: formData.postalCode || "",
        city: formData.city || "",
        regon: formData.regon,
        bankAccount: formData.bankAccount,
        email: formData.email,
        phone: formData.phone,
        isDefault: profiles.length === 0 ? true : false,
      };
      setProfiles((prev) => [...prev, newProfile]);
    }
    setIsDialogOpen(false);
  };
  
  const handleSetDefault = (id: string) => {
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }))
    );
  };
  
  const handleDelete = (id: string) => {
    const isDefault = profiles.find((p) => p.id === id)?.isDefault;
    let newProfiles = profiles.filter((p) => p.id !== id);
    
    // If we're deleting the default profile and others exist, set a new default
    if (isDefault && newProfiles.length > 0) {
      newProfiles = newProfiles.map((p, index) => ({
        ...p,
        isDefault: index === 0,
      }));
    }
    
    setProfiles(newProfiles);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ustawienia</h1>
          <p className="text-muted-foreground">Zarządzaj ustawieniami systemu</p>
        </div>
      </div>
      
      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">Profile firmowe</TabsTrigger>
          <TabsTrigger value="numbering">Numeracja</TabsTrigger>
          <TabsTrigger value="ksef">KSeF</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profiles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Profile firmowe</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj profil
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {currentProfile ? "Edytuj profil" : "Dodaj nowy profil"}
                  </DialogTitle>
                  <DialogDescription>
                    Uzupełnij dane firmowe, które będą używane na fakturach.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nazwa firmy *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name || ""}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxId">NIP *</Label>
                        <Input
                          id="taxId"
                          name="taxId"
                          value={formData.taxId || ""}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Adres *</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address || ""}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Kod pocztowy *</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode || ""}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Miejscowość *</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city || ""}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="regon">REGON</Label>
                        <Input
                          id="regon"
                          name="regon"
                          value={formData.regon || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Numer konta bankowego</Label>
                        <Input
                          id="bankAccount"
                          name="bankAccount"
                          value={formData.bankAccount || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Adres e-mail</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Zapisz</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            {profiles.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p>Nie masz jeszcze żadnych profili firmowych.</p>
                  <Button className="mt-4" onClick={() => handleOpenDialog()}>
                    Dodaj pierwszy profil
                  </Button>
                </CardContent>
              </Card>
            ) : (
              profiles.map((profile) => (
                <Card key={profile.id} className={profile.isDefault ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          {profile.name}
                          {profile.isDefault && (
                            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Domyślny
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>NIP: {profile.taxId}</CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenDialog(profile)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(profile.id)}
                          disabled={profiles.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Adres</p>
                        <p>{profile.address}</p>
                        <p>
                          {profile.postalCode} {profile.city}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Kontakt</p>
                        <p>{profile.email || "Brak adresu e-mail"}</p>
                        <p>{profile.phone || "Brak numeru telefonu"}</p>
                      </div>
                    </div>
                    {!profile.isDefault && (
                      <Button
                        variant="link"
                        className="mt-4 p-0 h-auto"
                        onClick={() => handleSetDefault(profile.id)}
                      >
                        Ustaw jako domyślny
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="numbering">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia numeracji</CardTitle>
              <CardDescription>
                Skonfiguruj sposób generowania numerów faktur.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Ta sekcja będzie zawierać ustawienia numeracji faktur.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ksef">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia KSeF</CardTitle>
              <CardDescription>
                Skonfiguruj integrację z Krajowym Systemem e-Faktur.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Ta sekcja będzie zawierać ustawienia integracji z KSeF.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessProfiles;
