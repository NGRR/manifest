# manifest

Manifiesto para la restauración del tejido social y la transformación democrática de la riqueza.

Sitio estático e interactivo. El manifiesto se estructura en 25 artículos y párrafos direccionables; el mapa técnico conecta cada criterio con módulos de implementación, perfiles, dependencias, fórmulas, costos e indicadores de preparación.

## Estructura

- `index.html`: interfaz principal y contenedores de navegación.
- `assets/css/site.css`: sistema visual derivado del lenguaje editorial de `novilloencaos`, adaptado al manifiesto.
- `assets/js/data.js`: manifiesto, artículos, módulos, perfiles y parámetros de cálculo.
- `assets/js/app.js`: render, navegación, mapa, calculadoras y filtros.
- `.nojekyll`: despliegue estático directo en GitHub Pages.

## Modelo de cálculo

El presupuesto es paramétrico. El valor inicial usa el Ingreso Mínimo Mensual chileno vigente desde mayo de 2026 (`$553.553 CLP`) sólo como unidad de escala salarial y puede modificarse desde la interfaz.

Principales fórmulas:

- muestra: corrección por población finita sobre `n0 = z²·p·(1-p)/e²`;
- celdas territoriales: `ceil(población / habitantes por celda)`;
- personal: `Σ(meses-persona × multiplicador salarial × IMM × factor de carga)`;
- operación: unidades IMM fijas + unidades por celda + unidades por participante;
- total: `(personal + operación + tecnología) × (1 + overhead + contingencia)`;
- preparación: índice ponderado de datos, legitimidad, confianza, capacidad institucional, factibilidad legal, economía, manejo de conflicto y pluralidad de mercado, sujeto a compuertas mínimas.

Los montos son planificación de referencia, no cotizaciones ni aranceles profesionales. La precisión proviene de la fórmula y de sus supuestos visibles, no de presentar estimaciones como precios universales.

## Publicación

El repositorio está preparado para GitHub Pages desde la raíz de `main`.
