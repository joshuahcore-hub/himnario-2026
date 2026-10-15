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
      // (1.13.4) En el computador (≥ 600 px, donde sonner centra con left 50 %) el ancho automático se encogía a CERO
      // y el aviso salía como una columna gris con las letras una bajo otra: ahí, ancho fijo (la píldora se centra dentro).
      className="toaster group max-[599px]:!w-auto min-[600px]:!w-[min(520px,calc(100vw-32px))]"
      offset={margen}
      mobileOffset={margen}
      gap={8}
      toastOptions={{ unstyled: true }}
      {...props}
    />
  );
};

export { Toaster, toast };
