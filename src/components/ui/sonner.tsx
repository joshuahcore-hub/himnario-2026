import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Avisos de arriba (1.13.1, Josué): la PÍLDORA la dibuja src/lib/aviso.tsx (pequeña, centrada, gris oscuro). Aquí solo
// la posición: arriba, centrada en la pantalla, con el mismo margen a los lados.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const margen = { top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: '16px', right: '16px' };
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // En el celular sonner pone ancho 100 % además de los márgenes y quedaba corrido: ancho automático.
      className="toaster group !w-auto"
      offset={margen}
      mobileOffset={margen}
      gap={8}
      toastOptions={{ unstyled: true }}
      {...props}
    />
  );
};

export { Toaster, toast };
