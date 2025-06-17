import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import { createInventoryMovement } from "@/integrations/supabase/repositories/inventoryRepository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quantityInput, setQuantityInput] = useState<Record<string, number>>({});

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", user?.id, "all"],
    queryFn: () => {
      if (!user) throw new Error("Not authenticated");
      return getProducts(user.id);
    },
    enabled: !!user,
  });

  const movementMutation = useMutation({
    mutationFn: createInventoryMovement,
    onSuccess: () => {
      toast.success("Inventory updated");
      queryClient.invalidateQueries({ queryKey: ["products", user?.id, "all"] });
    },
    onError: () => toast.error("Failed to update inventory"),
  });

  const handleSubmit = (productId: string, type: "sale" | "restock") => {
    const qty = quantityInput[productId];
    if (!qty || qty <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }
    if (!user) return;
    movementMutation.mutate({
      userId: user.id,
      productId,
      quantity: qty,
      type,
    });
    setQuantityInput((prev) => ({ ...prev, [productId]: 0 }));
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardTitle className="p-4">Inventory Tracking</CardTitle>
        <div className="p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell>{prod.name}</TableCell>
                  <TableCell className="text-right">{prod.stock}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={1}
                      value={quantityInput[prod.id] || ""}
                      onChange={(e) =>
                        setQuantityInput((prev) => ({ ...prev, [prod.id]: Number(e.target.value) }))
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell className="flex gap-2 justify-end">
                    <Button size="sm" onClick={() => handleSubmit(prod.id, "sale")}>Sale</Button>
                    <Button size="sm" variant="outline" onClick={() => handleSubmit(prod.id, "restock")}>Restock</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default InventoryPage; 