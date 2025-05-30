import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Star } from "lucide-react";
import { useAuth } from "@/App"; // Import useAuth hook

const SettingsMenu = () => {
  const { isPremium } = useAuth(); // Use isPremium from auth context

  // Check if a nested route is matched. If so, render the Outlet.
  // Otherwise, render the main menu content.
  const isNestedRoute = location.pathname !== '/settings'; // Simple check, might need refinement

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ustawienia</h1>
          <p className="text-muted-foreground">
            Zarządzaj ustawieniami konta i profilami firmowymi.
          </p>
        </div>
        {isPremium ? (
          <div className="flex items-center text-amber-500 font-semibold">
            <Star className="mr-2 h-5 w-5" fill="currentColor" />
            <span>Jesteś Premium, zarządzaj subskrypcją</span>
          </div>
        ) : (
          <Button variant="default" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Star className="mr-2 h-4 w-4" />
            Kup subskrypcję Premium
          </Button>
        )}
      </div>

      {/* Render Outlet for nested routes or the menu if no nested route is matched */}
      <Outlet />

      {/* Optionally, you could add conditional rendering here if you only want the menu when NOT on a nested route */}
      {/* {!isNestedRoute && (
        <Card>
          <CardHeader>
            <CardTitle>Menu Ustawień</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Link to="/settings/business-profiles">
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="mr-2 h-4 w-4" />
                  Profile Firmowe
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Settings className="mr-2 h-4 w-4" />
                Ustawienia Konta (Wkrótce)
              </Button>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* For now, let's keep the menu always visible, and Outlet will render nested content below it */}
       <Card>
          <CardHeader>
            <CardTitle>Menu Ustawień</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Link to="/settings/business-profiles">
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="mr-2 h-4 w-4" />
                  Profile Firmowe
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Settings className="mr-2 h-4 w-4" />
                Ustawienia Konta (Wkrótce)
              </Button>
            </div>
          </CardContent>
        </Card>

    </div>
  );
};

export default SettingsMenu; 