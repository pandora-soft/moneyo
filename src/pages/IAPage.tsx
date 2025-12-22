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
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isMultiShot, setIsMultiShot] = useState(false);
  const [firstShot, setFirstShot] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const openModal = useAppStore((s) => s.openModal);
  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowPlayOverlay(false);
  }, []);
  const startStream = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: 'environment' }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('No se pudo acceder a la cámara.');
    }
  }, []);
  const handleAnalysis = async (base64Image: string) => {
    setIsLoading(true);
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      toast.error('Configura tu clave API de Gemini en Ajustes.');
      setIsLoading(false);
      return;
    }
    try {
      const result = await analyzeReceipt(base64Image, apiKey);
      openModal({
        type: 'expense',
        amount: result.amount || 0,
        category: result.category || 'Otro',
        note: result.merchant || 'Recibo analizado',
        ts: result.date ? new Date(result.date).getTime() : Date.now(),
        attachmentDataUrl: base64Image,
      });
      toast.success('Recibo analizado con éxito.');
    } catch (error: any) {
      toast.error('Error al analizar la imagen.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleAnalysis(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const openCamera = async (multiShot = false) => {
    setCameraLoading(true);
    setIsMultiShot(multiShot);
    setFirstShot(null);
    setCameraOpen(true);
    await startStream();
    setCameraLoading(false);
  };
  const takePicture = () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (isMultiShot && !firstShot) {
      setFirstShot(dataUrl);
      toast.info('Primera parte capturada. Ahora captura la segunda.');
    } else if (isMultiShot && firstShot) {
      combineAndAnalyze(firstShot, dataUrl);
      setCameraOpen(false);
      stopCamera();
    } else {
      handleAnalysis(dataUrl);
      setCameraOpen(false);
      stopCamera();
    }
  };
  const combineAndAnalyze = (base64A: string, base64B: string) => {
    const imgA = new Image();
    const imgB = new Image();
    imgA.src = base64A;
    imgA.onload = () => {
      imgB.src = base64B;
      imgB.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(imgA.width, imgB.width);
        canvas.height = imgA.height + imgB.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(imgA, 0, 0);
        ctx.drawImage(imgB, 0, imgA.height);
        handleAnalysis(canvas.toDataURL('image/jpeg', 0.85));
      };
    };
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="text-center mb-12">
          <BrainCircuit className="mx-auto h-16 w-16 text-orange-500" />
          <h1 className="mt-4 text-4xl font-display font-bold tracking-tight">IA Moneyo</h1>
          <p className="mt-4 text-lg text-muted-foreground">Digitaliza tus recibos al instante.</p>
        </header>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
            <p className="text-muted-foreground">Analizando con Gemini...</p>
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
                className={cn("h-full cursor-pointer transition-all", isDragging && "border-orange-500 ring-2 ring-orange-500")}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <CardHeader>
                  <Upload className="h-8 w-8 text-orange-500" />
                  <CardTitle>Subir Foto</CardTitle>
                  <CardDescription>Sube o arrastra el archivo aquí.</CardDescription>
                </CardHeader>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <Camera className="h-8 w-8 text-orange-500" />
                  <CardTitle>Cámara</CardTitle>
                  <CardDescription>Captura el recibo ahora mismo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => openCamera(false)} disabled={cameraLoading}>Abrir Cámara</Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <Layers className="h-8 w-8 text-orange-500" />
                  <CardTitle>Multicaptura</CardTitle>
                  <CardDescription>Para recibos largos o complejos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => openCamera(true)} disabled={cameraLoading}>Iniciar Doble Captura</Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
      <Sheet open={isCameraOpen} onOpenChange={(open) => { if (!open) { stopCamera(); setCameraOpen(false); } }}>
        <SheetContent side="bottom" className="h-[90vh] p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{isMultiShot ? 'Captura por partes' : 'Capturar Recibo'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              onPlay={() => setShowPlayOverlay(false)}
              onWaiting={() => setCameraLoading(true)}
              onPlaying={() => setCameraLoading(false)}
              className="max-h-full max-w-full object-contain"
            />
            {showPlayOverlay && (
              <Button variant="secondary" onClick={() => videoRef.current?.play()}>Play Vista Previa</Button>
            )}
            {firstShot && <img src={firstShot} className="absolute top-4 left-4 w-20 border-2 border-white rounded shadow-lg opacity-80" />}
          </div>
          <div className="p-8 flex justify-center border-t bg-background">
            <Button size="lg" className="rounded-full w-20 h-20 shadow-xl" onClick={takePicture}>
              <Camera className="h-10 w-10" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}