# Guia de Ingesta de Documentos y Adicion de Casos Clinicos

Este documento detalla el procedimiento tecnico para incorporar nuevas Guias de Practica Clinica (GPC) en formato PDF al motor RAG, como registrar nuevos casos clinicos simulados en el sistema Ateneo y las consideraciones para despliegue en nuevos servidores.

---

## 1. Arquitectura de Datos

El sistema gestiona dos fuentes principales de datos:

1. **Base de Conocimiento RAG (ChromaDB):**
   - Directorio de PDFs fuente: `backend/data/raw_pdfs/`
   - Directorio de persistencia vectorial: `backend/data/chroma_db/`

2. **Casos Clinicos Simulados:**
   - Archivo JSON de casos: `backend/cases_data/cases.json`
   - Directorio de imagenes estaticas: `backend/cases_data/images/`

---

## 2. Incorporacion de Guias de Practica Clinica (PDF)

### Paso 1: Almacenar los archivos PDF
Colocar los documentos PDF de las guias clinicas oficiales en la carpeta `backend/data/raw_pdfs/`.

Ejemplo:
```text
backend/data/raw_pdfs/gpc_ehirn2019.pdf
backend/data/raw_pdfs/hipertension.pdf
```

### Paso 2: Ejecutar el proceso de ingesta y vectorizacion

#### Opcion A: Entorno Docker
Si el sistema esta ejecutandose via Docker Compose, ejecutar la ingesta dentro del contenedor activo:

```bash
docker compose exec backend python ingestion/run_ingestion.py
```

#### Opcion B: Entorno Python local (Virtualenv)
Navegar al directorio `backend` y ejecutar el script de ingesta:

```bash
cd backend
python ingestion/run_ingestion.py
```

### Proceso interno realizado por el script
1. Extrae el texto plano pagina por pagina usando `pypdf`.
2. Segmenta el texto en fragmentos (*chunks*) por secciones clinicas especificas.
3. Genera representaciones vectoriales utilizando el modelo `BAAI/bge-m3`.
4. Indexa los vectores en la coleccion de ChromaDB con metadatos asociados (`guia_fuente`, `pagina`, `seccion`).

---

## 3. Registro de Nuevos Casos Clinicos

Para definir un nuevo caso clinico que utilice las guias ingresadas, se debe actualizar el archivo `backend/cases_data/cases.json`.

### Estructura del objeto JSON

Añadir una nueva entrada dentro del arreglo `"cases"`:

```json
{
  "id": "case_ehirn_01",
  "guia_asociada": "gpc_ehirn2019",
  "titulo": "Recién Nacido con Sangrado Umbilical por Deficiencia de Vitamina K (EHIRN)",
  "enunciado": "Recién nacido masculino de 3 días de vida, nacido de parto fortuito en domicilio sin control prenatal previo. La madre acude a emergencias pediátricas por presentar sangrado continuo en napa a nivel del muñón umbilical desde hace 6 horas, además de petequias aisladas y equimosis en sitios de venopunción. Examen físico: activo, pálido; PA 60/35 mmHg, FC 145 bpm, FR 42 rpm. Exámenes de laboratorio: TP y TTPa marcadamente prolongados, Fibrinógeno normal, Plaquetas 230,000/mm³.",
  "pregunta": "Establezca la sospecha diagnóstica según la GPC del MSP Ecuador (EHIRN / Enfermedad Hemorrágica por Deficiencia de Vitamina K), clasifique el cuadro clínico según el tiempo de presentación (temprana, clásica o tardía) e indique el esquema de tratamiento inmediato y dosis de Vitamina K requerida.",
  "nivel_esperado": "pregrado_avanzado"
}
```

### Campos requeridos y especificaciones
- `id`: Identificador unico en formato string (ejemplo: `case_ehirn_01`).
- `guia_asociada`: Nombre base del archivo PDF o codigo que identifica la guia en ChromaDB (ejemplo: `gpc_ehirn2019`).
- `titulo`: Titulo descriptivo del caso clinico.
- `enunciado`: Descripcion completa de la historia clinica, anamnesis, examen fisico y laboratorio.
- `pregunta`: Pregunta clinica de evaluacion dirigida al estudiante.
- `nivel_esperado`: Nivel de dificultad (`pregrado_intermedio`, `pregrado_avanzado`).
- `imagen_url` *(opcional)*: Ruta estatica si incluye recurso grafico (`/static/images/nombre_imagen.png`).
- `fragmento_gpc_ideal_id` *(opcional)*: ID del fragmento de referencia principal.

---

## 4. Administracion de Imagenes de Soporte Diagnostico

Si el caso incluye imagenes (ej. electrocardiogramas, radiografias, hemogramas):

1. Copiar el archivo de imagen (`.png`, `.jpg`, `.jpeg`) en el directorio `backend/cases_data/images/`.
2. Asignar el valor `/static/images/<nombre_imagen>.<ext>` al campo `imagen_url` en el objeto del caso dentro de `cases.json`.

---

## 5. Requisitos de Virtualización y Configuración de Docker para Fine-Tuning

### 5.1 Requisitos en Windows (WSL2)
Para ejecutar el entorno en un equipo Windows de forma 100% aislada (sin instalar Python ni dependencias en la máquina anfitrión):
1. **Virtualización en Firmware:** Asegurar que la virtualización Intel VT-x / AMD-V esté habilitada en el BIOS.
2. **Plataforma de Máquina Virtual:** Habilitar la característica opcional de Windows ejecutando en PowerShell como Administrador:
   ```powershell
   wsl --install --no-distribution
   ```
3. **Docker Desktop:** Iniciar Docker Desktop asegurando el uso del motor WSL2 Backend.

### 5.2 Configuración de Recursos y GPU en `docker-compose.yml`
Para permitir el uso de la GPU NVIDIA del anfitrión (con compatibilidad CUDA 12.x) y evitar errores de falta de memoria (OOM Killer):

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    deploy:
      resources:
        limits:
          memory: 14G      # Límite de memoria suficiente para Fine-Tuning sin colapso
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]   # Passthrough directo de la GPU NVIDIA al contenedor
```

### 5.3 Comandos para Generación de Dataset y Fine-Tuning en Docker
```bash
# 1. Generar el dataset de tripletas clínicas (Query, Positivo, Negativo)
docker compose exec backend python ingestion/create_ft_dataset.py

# 2. Ejecutar el Fine-Tuning del modelo BAAI/bge-m3 dentro del contenedor
docker compose exec backend python ingestion/train_fine_tuning.py
```

---

## 6. Verificacion del Funcionamiento

Despues de realizar los pasos anteriores:

1. Verificar la disponibilidad de los casos haciendo una peticion HTTP GET:
```bash
curl http://localhost:8000/api/cases
```
2. Realizar la prueba de evaluacion enviando la respuesta del estudiante a `/api/evaluate`.

