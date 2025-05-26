
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Plus, MoreVertical, Building2, Star } from "lucide-react";
import type { BusinessProfile } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalData } from "@/hooks/use-global-data";

const BusinessProfiles = () => {
  const navigate = useNavigate();
  const { businessProfiles: { data: profiles, isLoading, error } } = useGlobalData();
  const isMobile = useIsMobile();

  // Show error toast if there's an issue fetching the data
  React.useEffect(() => {
    if (error) {
      toast.error("Nie udało się pobrać profili firm");
      console.error("Error fetching business profiles:", error);
    }
  }, [error]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profile Firmowe</h1>
          <p className="text-muted-foreground">
            Zarządzaj swoimi profilami firmowymi.
          </p>
        </div>
        <Button onClick={() => navigate("/settings/business-profiles/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy profil
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Twoje profile firmowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">Ładowanie...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nie masz jeszcze żadnych profili firmowych.
              </p>
              <Button
                onClick={() => navigate("/settings/business-profiles/new")}
              >
                Dodaj pierwszy profil
              </Button>
            </div>
          ) : isMobile ? (
            // Mobile view with cards
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card key={profile.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <h3 className="font-medium">{profile.name}</h3>
                          {profile.isDefault && (
                            <Star className="ml-2 h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>NIP: {profile.taxId}</p>
                          <p>
                            {profile.address}, {profile.postalCode} {profile.city}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/settings/business-profiles/${profile.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop view with table
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Adres</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {profile.name}
                          {profile.isDefault && (
                            <Star className="ml-2 h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{profile.taxId}</TableCell>
                      <TableCell>
                        {profile.address}, {profile.postalCode} {profile.city}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              aria-label="Open menu"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/settings/business-profiles/${profile.id}`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessProfiles;
