import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { parseBankCsv } from "@/utils/parseBankCsv";
import { parseBankXml } from "@/utils/parseBankXml";
import { BankTransaction } from "@/types/bank";
import { uploadBankLog } from "@/integrations/supabase/repositories/bankLogRepository";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  onImport: (txs: BankTransaction[]) => void;
}

const ImportBankStatementDialog: React.FC<Props> = ({ open, onOpenChange, accountId, onImport }) => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // Upload to Supabase Storage
    if (user?.id) {
      try {
        await uploadBankLog({ userId: user.id, file, filename: file.name });
        toast.success("Plik został przesłany do chmury (Supabase)");
      } catch (err: any) {
        toast.error("Błąd przesyłania pliku do chmury: " + (err.message || err.toString()));
      }
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        let txs: BankTransaction[] = [];
        if (file.name.toLowerCase().endsWith(".csv")) {
          txs = parseBankCsv(text, accountId);
        } else if (file.name.toLowerCase().endsWith(".xml")) {
          txs = parseBankXml(text, accountId);
        } else {
          throw new Error("Nieobsługiwany format pliku. Użyj CSV lub XML.");
        }
        if (txs.length === 0) throw new Error("Brak transakcji w pliku");
        setTransactions(txs);
        toast.success(`Zaimportowano ${txs.length} transakcji`);
      } catch (err: any) {
        toast.error(err.message || "Nieprawidłowy plik bankowy");
        setTransactions([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    onImport(transactions);
    onOpenChange(false);
    setTransactions([]);
    setFileName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importuj wyciąg bankowy (CSV lub XML)</DialogTitle>
          <DialogDescription>
            Wybierz plik wyciągu bankowego w formacie CSV lub XML. Plik zostanie przesłany do chmury i przeanalizowany.
          </DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".csv,.xml" ref={fileRef} onChange={handleFile} />
        {fileName && <div className="text-xs mt-2">{fileName}</div>}
        {transactions.length > 0 && (
          <div className="max-h-40 overflow-y-auto border rounded mt-2 text-xs">
            <table className="w-full">
              <thead>
                <tr><th>Data</th><th>Opis</th><th>Kwota</th></tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.description}</td>
                    <td className={t.type === "income" ? "text-green-600" : "text-red-600"}>{t.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length > 10 && <div className="text-center py-1">...i {transactions.length - 10} więcej</div>}
          </div>
        )}
        <Button className="w-full mt-2" onClick={handleImport} disabled={transactions.length === 0}>Zapisz transakcje</Button>
      </DialogContent>
    </Dialog>
  );
};

export default ImportBankStatementDialog; 