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
      videoRef.current.load();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowPlayOverlay(false);
  }, []);

  // New effect: bind the stream to the video element and handle autoplay
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current && !(videoRef.current.srcObject)) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;

        const playVideo = () => {
          video.play().catch((e) => {
            console.warn('Autoplay failed, showing play button.', e);
            setShowPlayOverlay(true);
          });
        };

      if (video.readyState >= 3) {
        playVideo();
      } else {
        const handler = () => {
          playVideo();
        };
        video.addEventListener('canplay', handler, { once: true });
        return () => {
          video.removeEventListener('canplay', handler);
        };
      }
    }
  }, [isCameraOpen]);
  const startStream = useCallback(async () => {
    try {
      let stream: MediaStream | null = null;
      const commonConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
      // 1. Try rear camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { ...commonConstraints, facingMode: { ideal: 'environment' } },
        });
      } catch (e) {
        console.warn('Rear camera failed, trying front camera.', e);
        // 2. Try front camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { ...commonConstraints, facingMode: 'user' },
          });
        } catch (e2) {
          console.warn('Front camera failed, trying any camera.', e2);
          // 3. Try any camera as a last resort
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (e3) {
            console.error('All camera attempts failed.', e3);
            toast.error('No se pudo acceder a ninguna cámara.');
            return;
          }
        }
      }
      if (!stream) {
        toast.error('No se pudo inicializar la cámara.');
        return;
      }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const trackLabel = track.label || 'Cámara Desconocida';
      console.log('Stream success:', trackLabel);
      toast.success(
        /back|rear|environment/i.test(trackLabel)
          ? 'Cámara trasera activada'
          : 'Cámara frontal activada',
        { description: trackLabel }
      );

    } catch (error) {
      console.error('Error general en startStream:', error, navigator.userAgent);
      toast.error('Error al inicializar la cámara.');
    }
  }, []);

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
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

  };
  const openCamera = async (multiShot = false) => {
    console.log('openCamera called', multiShot);
    setCameraLoading(true);
    setIsMultiShot(multiShot);
    setFirstShot(null);
    await startStream(); // start the stream first

    if (!streamRef.current) {
      // Camera could not be started; abort opening the sheet
      setCameraLoading(false);
      return;
    }

    setCameraOpen(true); // then open the sheet
    setCameraLoading(false); // finally clear loading state
  };
  const takePicture = () => {
    if (showPlayOverlay || !videoRef.current || videoRef.current.readyState < 2) {
      toast.warning('La vista previa no está lista. Toca "Play" primero.');
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
                <div className="w-full block cursor-pointer">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={(e) => {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                  >
                    Seleccionar Archivo
                  </Button>
                </div>
                <input
                  type="file"
                  id="receipt-upload"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
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
                  <Button
                    type="button"
                    className="w-full"
                    disabled={cameraLoading || isCameraOpen || isLoading}
                    onClick={async (e) => {
                      e.preventDefault();
                      await openCamera(false);
                    }}
                  >
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
                  <Button
                    type="button"
                    className="w-full"
                    disabled={cameraLoading || isCameraOpen || isLoading}
                    onClick={async (e) => {
                      e.preventDefault();
                      await openCamera(true);
                    }}
                  >
                    Iniciar Captura Doble
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
      <Sheet
        open={isCameraOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCameraLoading(false);
            stopCamera();
            setCameraOpen(false);
          }
        }}
      >
        <SheetContent
          className="fixed inset-0 z-[9999] w-screen h-screen p-0 flex flex-col sm:relative sm:inset-auto sm:w-[400px] sm:h-[90vh] sm:max-w-md sm:rounded-lg sm:shadow-2xl"
          aria-describedby="camera-sheet-desc"
        >
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