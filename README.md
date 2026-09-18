# Amazonia // Live Canopy

Dashboard interactivo en D3.js. Funciona sin internet: D3, fuentes y datos van incluidos.

## Ver en local
Doble clic en `index.html`, o con servidor local:

    python -m http.server 8000
    # abrir http://localhost:8000

## Estructura
    index.html            maquetación (lienzo 1672×941 escalado a la ventana)
    css/style.css         estilos + fuentes IBM Plex Mono locales
    js/main.js            gráficas, cursor, callout, barras por estado, brasas
    data/*.csv            datos originales
    data/data.js          datos agregados que usa el dashboard
    assets/hero.jpg       render del bosque sin textos (generado del boceto)
    assets/boceto.png     boceto original
    vendor/d3.min.js      D3 v7.8.5
    fonts/                IBM Plex Mono 300–600
    scripts/              build_data.py y clean_hero.py

## Regenerar (desde la raíz del proyecto)
    pip install pandas opencv-python-headless
    python scripts/build_data.py   # tras cambiar los CSV
    python scripts/clean_hero.py   # tras cambiar el boceto
