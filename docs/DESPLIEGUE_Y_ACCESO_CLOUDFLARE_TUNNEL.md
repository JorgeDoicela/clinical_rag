# Acceso Remoto Seguro con Cloudflare Tunnel (Ateneo Clinical RAG)

Este documento describe la arquitectura de despliegue y acceso remoto para el sistema Ateneo Clinical RAG mediante Cloudflare Tunnel, permitiendo la comunicacion publica segura bajo el dominio oficial sin requerir IP publica fija ni apertura de puertos en la red perimetral.

---

## 1. Arquitectura de Red y Enrutamiento

El trafico hacia Ateneo Clinical RAG ingresa a traves del borde de Cloudflare y es canalizado hacia el host local:

```
[ Navegador del Usuario ]
           |
           |  HTTPS (TLS 1.3 - Dominio: https://ateneo.doicela.dev)
           v
[ Red Perimetral de Cloudflare (WAF, Anti-DDoS, Edge SSL) ]
           |
           |  Tunel Cifrado Seguro (Conexion saliente QUIC / HTTP2)
           v
[ Daemon cloudflared en Host ]
           |
           |  HTTP (127.0.0.1:5173 - Red local)
           v
[ Contenedor Docker: Frontend (Vite + React) ]
           |
           |  Proxy Interno Docker (/api/* y /static/*)
           v
[ Contenedor Docker: Backend (FastAPI / Uvicorn en puerto 8000) ]
```

---

## 2. Especificacion Tecnica del Servicio

* **Dominio Asignado:** `ateneo.doicela.dev`
* **URL de Acceso Web:** `https://ateneo.doicela.dev`
* **Servicio de Destino Local:** `http://localhost:5173` (o `http://127.0.0.1:5173`)
* **Contenedores de Aplicacion:**
  * `clinical_rag_v2-frontend-1`: Puerto host `5173:5173` (React + Vite)
  * `clinical_rag_v2-backend-1`: Puerto host `8000:8000` (FastAPI / PyTorch / Qdrant)
* **Resolucion Interna de la API:** El servidor de desarrollo Vite incluye un proxy configurado en `vite.config.js` que redirige automaticamente las peticiones a `/api` y `/static` hacia `http://backend:8000`. De esta forma, el tunel solo necesita apuntar al puerto del frontend (`5173`).

---

## 3. Seguridad Perimetral

1. **Terminacion Criptografica en el Borde:** Cloudflare gestiona los certificados publicos y la negociacion HTTPS TLS 1.3.
2. **Aislamiento de Infraestructura:** El host no expone puertos entrantes hacia Internet; el daemon del tunel establece conexiones exclusivamente salientes hacia la red anycast de Cloudflare.
3. **Cero Dependencia de Certificados Locales:** No se requiere la presencia de claves privadas ni archivos de configuracion sensible en el directorio del proyecto.

---

## 4. Procedimiento de Arranque y Operacion

### Paso 1: Levantar los Contenedores con Docker Compose
En una terminal situada en la raiz del proyecto `clinical_rag`:

```bash
docker compose up -d
```

Verificar que ambos servicios se encuentren en estado de ejecucion saludable:
```bash
docker compose ps
```

### Paso 2: Iniciar el Tunel de Cloudflare
Desde cualquier consola de PowerShell del sistema, iniciar el servicio del tunel:

```powershell
cloudflared tunnel --config "C:\ProgramData\cloudflared\config.yml" run
```

O mediante la suite de gestion:
```powershell
& "c:\Users\DESARROLLADOR\Desktop\Proyectos\diitra\scripts\despliegue\setup_cloudflare_tunnel.ps1"
```
(Seleccionando la opcion `[1]`).

### Paso 3: Verificacion de Acceso
Abrir en el navegador:
* `https://ateneo.doicela.dev`

### Paso 4: Detencion del Servicio
Para suspender la exposicion publica, presionar `Ctrl + C` en la terminal del tunel.
Para detener los contenedores locales cuando no se requieran:
```bash
docker compose down
```