import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";
import { signContract } from "@/modules/contracts/data/contractSignatureRepository";

interface SignaturePadModalProps {
  open: boolean;
  onClose: () => void;
  contractId: string;
  onSigned: (url: string) => void;
}

const SignaturePadModal: React.FC<SignaturePadModalProps> = ({ open, onClose, contractId, onSigned }) => {
  const sigRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  const handleClear = () => {
    sigRef.current?.clear();
  };

  const handleSave = async () => {
    if (sigRef.current?.isEmpty()) {
      toast.error("Podpis jest pusty");
      return;
    }
    setSaving(true);
    try {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      const url = await signContract(contractId, dataUrl);
      toast.success("Umowa podpisana");
      onSigned(url);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się zapisać podpisu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Złóż podpis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Signature pad */}
          <div className="border rounded-md overflow-hidden bg-white">
            {open && <SignatureCanvas ref={sigRef} penColor="black" canvasProps={{ width: 500, height: 200, className: "w-full" }} />}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClear}>Wyczyść</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Zapisywanie..." : "Zapisz podpis"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignaturePadModal; 