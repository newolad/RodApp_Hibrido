-- Contenido inicial de `consejos` (antes estaba fijo en el codigo de la vista
-- Consejos). Es contenido global de solo lectura para los usuarios; un admin
-- puede editarlo despues. Idempotente: solo inserta los titulos que falten.

insert into public.consejos (categoria, titulo, resumen, contenido, lectura)
select v.categoria, v.titulo, v.resumen, v.contenido, v.lectura
from (
  values
    (
      'Seguridad',
      'Cómo frenar en lluvia sin bloquear la rueda',
      'Dosifica el freno delantero, usa el trasero de apoyo y aumenta la distancia con el vehículo de adelante.',
      E'Con el piso mojado el agarre baja hasta la mitad. Frena antes y con más suavidad: aplica primero el trasero para asentar la moto y luego el delantero de forma progresiva, nunca de golpe.\n\nEvita frenar sobre líneas pintadas, tapas de alcantarilla y charcos, y duplica la distancia con el vehículo de adelante. Si tu moto tiene ABS, mantén la presión firme y deja que el sistema trabaje.',
      '4 min de lectura'
    ),
    (
      'Mantenimiento',
      'Tensión y lubricación de la cadena',
      'Revisa la holgura cada 500 km y lubrica en caliente para que el producto penetre en los eslabones.',
      E'Una cadena floja desgasta piñón y corona y puede saltarse; una muy tensa fuerza los rodamientos. Mide la holgura en el punto medio del tramo inferior: lo usual es entre 2 y 3 cm (revisa el manual de tu moto).\n\nLubrica después de rodar, con la cadena tibia, aplicando el producto en la cara interna. Limpia el exceso para que no acumule tierra.',
      '3 min de lectura'
    ),
    (
      'Ruta',
      'Planifica paradas de tanqueo en carretera',
      'Calcula la autonomía real de tu moto y marca estaciones cada 150 km para no quedarte sin combustible.',
      E'La autonomía real cambia con la carga, el viento y la altura. Con tus registros de combustible en RodApp puedes estimar cuántos km haces por tanqueada.\n\nAntes de salir marca en el mapa estaciones cada 150 km como máximo y no dejes que el tanque baje de un cuarto en tramos sin poblaciones.',
      '5 min de lectura'
    ),
    (
      'Mantenimiento',
      'Presión de las llantas: revísala en frío',
      'Una presión baja aumenta el consumo y empeora el agarre en curva. Revísala cada semana.',
      E'Mide la presión con la llanta fría (antes de rodar o tras una hora parada). El valor recomendado está en el manual o en una etiqueta del basculante.\n\nSi viajas con parrillero o equipaje, súbela según indique el fabricante. Revisa también el desgaste: el mínimo legal del labrado es de 1 mm, pero cambia la llanta antes.',
      '3 min de lectura'
    ),
    (
      'Seguridad',
      'Casco: cuándo cambiarlo',
      'Después de un golpe fuerte o cada 5 años, aunque se vea bien por fuera.',
      E'El material interno (poliestireno expandido) absorbe un solo impacto: tras una caída fuerte ya no protege igual aunque la carcasa no tenga daños visibles.\n\nAunque no haya golpes, los materiales se degradan con el sol y el sudor. Cámbialo cada 5 años y verifica que tenga certificación vigente.',
      '2 min de lectura'
    )
) as v (categoria, titulo, resumen, contenido, lectura)
where not exists (
  select 1 from public.consejos c where c.titulo = v.titulo
);
