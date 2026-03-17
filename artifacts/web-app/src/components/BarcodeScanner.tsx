import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, ScanLine } from "lucide-react";

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = "html5-qrcode-reader";
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      containerId,
      {
        fps: 10,
        qrbox: { width: 280, height: 180 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        aspectRatio: 1.5,
        showTorchButtonIfSupported: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setLastScanned(decodedText);
        setScanning(false);
        scanner.clear().catch(() => {});
        onScan(decodedText);
      },
      (_errorMessage) => {
        // Normal scanning errors — ignore
      }
    );
    scannerRef.current = scanner;
    setScanning(true);

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl overflow-hidden w-full max-w-md">
        {/* Sarlavha */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-primary" />
            <h3 className="font-semibold">Shtrix/QR kod skanerlash</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Ko'rsatma */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Camera size={12} />
            Shtrix kod yoki QR kodni kamera oldiga tuzing
          </p>
        </div>

        {/* Scanner */}
        <div className="px-4 pb-4">
          <div
            id={containerId}
            className="overflow-hidden rounded-xl"
            style={{ minHeight: 260 }}
          />

          {lastScanned && (
            <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-center">
              <p className="text-green-700 text-sm font-semibold">Skanerland!</p>
              <p className="text-green-600 text-xs mt-1 font-mono break-all">{lastScanned}</p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Bekor qilish
          </Button>
        </div>
      </div>
    </div>
  );
}
