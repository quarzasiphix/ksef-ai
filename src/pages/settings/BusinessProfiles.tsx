
import React, { useState, useEffect } from "react";
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
import { getBusinessProfiles } from "@/integrations/supabase/repositories/businessProfileRepository";
import type { BusinessProfile } from "@/types";

const BusinessProfiles = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data = await getBusinessProfiles();
        setProfiles(data);
      } catch (error) {
        console.error("Error fetching business profiles:", error);
        toast.error("Nie udało się pobrać profili firm");
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

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
          {loading ? (
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
          ) : (
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
