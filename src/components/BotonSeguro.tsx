// <button> con toque seguro (useToque): se activa al soltar el dedo, aunque el navegador no genere el click (pasa
// con el primer toque justo después de deslizar o mover una lista). Mismo uso que <button onClick={…}> (1.7.4).
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { useToque } from '@/hooks/useToque';

const BotonSeguro = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(({ onClick, ...props }, ref) => {
  const toque = useToque(e => onClick?.(e as React.MouseEvent<HTMLButtonElement>));
  return <button ref={ref} type="button" {...props} {...(onClick ? toque : {})} />;
});
BotonSeguro.displayName = 'BotonSeguro';

export default BotonSeguro;
