import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, easeOut } from 'framer-motion';
import { BrainCircuit, Upload, Camera, Layers, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';
import { analyzeReceipt } from '@/lib/gemini-client';
import { cn } from '@/lib/utils';
import t from '@/lib/i18n';
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: easeOut } },
};
export function IAPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [isMultiShot, setIsMultiShot] = useState(false);
  const [firstShot, setFirstShot] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const openModal = useAppStore((s) => s.openModal);
  const stopCamera = useCallback(() => {
  // Pause and clear video element first
  if (videoRef.current) {
    videoRef.current.pause();
    videoRef.current.srcObject = null;
    videoRef.current.load();
  }

  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
  setShowPlayOverlay(false);
}, []);

// Stub for future stream initialization
const startStream = useCallback(async () => {
  console.log('startStream initiated');
  try {
    // Get permission with minimal constraints
    const permStream = await navigator.mediaDevices.getUserMedia({ video: true });
    permStream.getTracks().forEach(track => track.stop());
  } catch (e) {
    console.error('Permission denied:', e);
    toast.error('Camera permission required.');

    setCameraOpen(false);
    return;
  }

  // Enumerate with labels now available
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevs = devices.filter((d) => d.kind === 'videoinput');
  console.table(
    videoDevs.map((d) => ({
      label: d.label,
      deviceId: d.deviceId.slice(-4),
      groupId: d.groupId?.slice(-4),
    }))
  );

  if (videoDevs.length === 0) {
    toast.error('No video devices found.');
    setCameraOpen(false);
    return;
  }

  // Select preferred: rear > front > first
  let selected =
    videoDevs.find((d) => /back|rear|environment/i.test(d.label)) ||
    videoDevs.find((d) => /front|user|selfie|face/i.test(d.label)) ||
    videoDevs[0];

  console.log('Selected:', selected.label || 'unknown', selected.deviceId.slice(-4));

  // Primary constraints
  const primaryConstraints = {
    video: {
      deviceId: { exact: selected.deviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
  } catch (e) {
    console.warn('Exact deviceId failed:', e);
    // Fallback
    const fallbackConstraints = [
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
    ];

    for (const cons of fallbackConstraints) {
      try {
        console.log('Fallback try:', JSON.stringify(cons.video.facingMode || cons.video));
        stream = await navigator.mediaDevices.getUserMedia(cons);
        break;
      } catch (err) {
        console.warn('Fallback failed:', err);
      }
    }
  }

  if (!stream) {
    toast.error('Unable to access any camera.');
    setCameraOpen(false);
    return;
  }

  streamRef.current = stream;
  const track = stream.getVideoTracks()[0];
  const settings = track.getSettings();
  const usedDeviceId = settings.deviceId;
  const usedDev = videoDevs.find((d) => d.deviceId === usedDeviceId);
  const label = usedDev?.label || 'Unknown';
  const isRear = /back|rear|environment/i.test(label);
  toast.success(isRear ? 'Rear cam OK' : 'Using front cam', { description: label });

  // Video setup
  if (videoRef.current) {
    const video = videoRef.current;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch((e) => {
      console.warn('Autoplay failed:', e);
      setShowPlayOverlay(true);
    });
  }
} catch (error) {
  console.error('startStream error:', error);
  toast.error('Camera failed to initialize');
}

// Trigger stream stub when the sheet opens
useEffect(() => {
  if (isCameraOpen && !streamRef.current) {
    startStream();
  }
}, [isCameraOpen, startStream]);
  const handleAnalysis = async (base64Image: string) => {
    setIsLoading(true);
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      toast.error('Clave API de Gemini no encontrada.', { description: 'Por favor, configúrala en la página de Ajustes.' });
      setIsLoading(false);
      return;
    }
    try {
      const result = await analyzeReceipt(base64Image, apiKey);
      const transactionData = {
        type: 'expense' as const,
        amount: result.amount || 0,
        category: result.category || 'Otro',
        note: result.merchant || 'Recibo analizado',
        ts: result.date ? new Date(result.date).getTime() : Date.now(),
        attachmentDataUrl: base64Image,
      };
      openModal(transactionData);
      toast.success('Recibo analizado con éxito.', { description: 'Revisa y guarda la nueva transacción.' });
    } catch (error: any) {
      toast.error('Error al analizar la imagen.', { description: error.message || 'Inténtalo de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleAnalysis(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  const openCamera = (multiShot = false) => {
  // Minimal opening logic – stream handling moved to startStream effect
  setIsMultiShot(multiShot);
  setFirstShot(null);
  setCameraOpen(true);
};
  const takePicture = () => {
  if (showPlayOverlay || !videoRef.current || videoRef.current.readyState < 2) {
    toast.warning('Preview not ready - tap play first');
    return;
  }
  const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    if (isMultiShot && !firstShot) {
      setFirstShot(dataUrl);
      toast.info('Primera parte capturada.', { description: 'Ahora captura la segunda parte del recibo.' });
    } else if (isMultiShot && firstShot) {
      combineAndAnalyze(firstShot, dataUrl);
      stopCamera();
      setCameraOpen(false);
    } else {
      handleAnalysis(dataUrl);
      stopCamera();
      setCameraOpen(false);
    }
  };
  const combineAndAnalyze = (base64A: string, base64B: string) => {
    const imgA = new Image();
    imgA.src = base64A;
    imgA.onload = () => {
      const imgB = new Image();
      imgB.src = base64B;
      imgB.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(imgA.width, imgB.width);
        canvas.height = imgA.height + imgB.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(imgA, 0, 0);
        ctx.drawImage(imgB, 0, imgA.height);
        handleAnalysis(canvas.toDataURL('image/jpeg'));
      };
    };
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="text-center mb-12">
          <BrainCircuit className="mx-auto h-16 w-16 text-orange-500" />
          <h1 className="mt-4 text-4xl font-display font-bold tracking-tight sm:text-5xl">
            Analizar Recibo con IA
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Sube o toma una foto de tu recibo y deja que la IA extraiga los datos por ti.
          </p>
        </header>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
            <p className="text-muted-foreground">Analizando imagen... esto puede tardar un momento.</p>
            <Skeleton className="h-64 w-full max-w-md" />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <Card
                className={cn(
                  "h-full transition-all duration-300",
                  isDragging && "border-primary ring-2 ring-primary"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelect(e.dataTransfer.files[0] ?? null);
                }}
              >
                <CardHeader>
                  <Upload className="h-8 w-8 text-orange-500" />
                  <CardTitle>Mandar Foto</CardTitle>
                  <CardDescription>Sube una imagen de tu recibo desde tu dispositivo.</CardDescription>
                </CardHeader>
                <CardContent>
<label htmlFor="receipt-upload" className="w-full block cursor-pointer">
  <Button className="w-full">
    Seleccionar Archivo
  </Button>
</label>
<input
  type="file"
  id="receipt-upload"
  className="hidden"
  accept="image/*"
  capture="environment"
  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
/>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <Camera className="h-8 w-8 text-orange-500" />
                  <CardTitle>Tomar Foto</CardTitle>
                  <CardDescription>Usa la cámara de tu dispositivo para capturar el recibo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => openCamera(false)}>
                    Abrir Cámara
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <Layers className="h-8 w-8 text-orange-500" />
                  <CardTitle>Tomar por Partes</CardTitle>
                  <CardDescription>Captura recibos largos en dos fotos separadas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => openCamera(true)}>
                    Iniciar Captura Doble
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
      <Sheet open={isCameraOpen} onOpenChange={(open) => { if (!open) { stopCamera(); setCameraOpen(false); setShowPlayOverlay(false); } }}>
        <SheetContent className="w-full h-full sm:max-w-full p-0 flex flex-col" aria-describedby="camera-sheet-desc">
          <SheetHeader className="p-4 border-b flex-shrink-0">
            <SheetTitle>{isMultiShot ? (firstShot ? 'Captura la 2ª Parte' : 'Captura la 1ª Parte') : 'Capturar Recibo'}</SheetTitle>
            <SheetDescription id="camera-sheet-desc">Apunta al recibo y asegúrate de que sea legible.</SheetDescription>
          </SheetHeader>
          <div className="relative flex-grow bg-black flex items-center justify-center min-h-0">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover bg-black" />
            {firstShot && isMultiShot && (
              <img src={firstShot} alt="Primera captura" className="absolute top-4 left-4 w-24 h-auto border-2 border-white rounded-md opacity-80" />
            )}
            {showPlayOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"
              >
              <Button
                onClick={() => {
                  setShowPlayOverlay(false);
                  if (videoRef.current) videoRef.current.play();
                }}
                className="w-28 h-28 p-0 rounded-full bg-white/20 text-white border-4 border-white/50 shadow-2xl text-4xl font-bold"
              >
                Play
              </Button>
              </motion.div>
            )}
          </div>
          <div className="p-4 border-t flex-shrink-0 flex justify-center">
            <Button size="lg" className="rounded-full w-20 h-20" onClick={takePicture}>
              <Camera className="h-8 w-8" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}