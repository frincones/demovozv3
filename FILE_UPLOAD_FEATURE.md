# File Upload Feature - Video Verification Modal

## Resumen

Se ha implementado exitosamente la opción de cargar archivos de video en la modal de verificación de identidad. Ahora los usuarios pueden elegir entre:

1. **Grabar video en vivo** (funcionalidad existente)
2. **Subir video grabado** (nueva funcionalidad)

## Cambios Implementados

### Archivo Modificado
- **`src/components/AVSyncChallengeModal.tsx`** (único archivo modificado)

### Nuevas Características

#### 1. Estados Agregados
```typescript
const [uploadMode, setUploadMode] = useState<UploadMode>('live' | 'upload');
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
```

#### 2. Nuevos Tipos de Estado
```typescript
type ChallengeState =
  | 'file-select'    // Seleccionar archivo (modo upload)
  | 'preview'        // Preview del archivo (modo upload)
  // ... estados existentes
```

#### 3. Handler de Selección de Archivos
- **`handleFileSelect()`**: Valida y procesa archivos seleccionados
  - Valida tipo de archivo (debe ser video/*)
  - Valida tamaño (máx. 10 MB)
  - Actualiza estado a 'preview'

#### 4. handleProcessVideo Modificado
- Ahora detecta automáticamente el modo (live vs upload)
- Usa `recordedBlob` para modo live
- Usa `uploadedFile` para modo upload
- Ambos convergen en el mismo `avSyncService.scoreVideo()`

#### 5. Nueva UI

**Selector de Modo (Estado 'instructions'):**
- Radio buttons para elegir entre grabar o subir
- Instrucciones dinámicas según el modo seleccionado
- Botón dinámico: "Comenzar Grabación" o "Seleccionar Video"

**Estado 'file-select':**
- Área de drop/upload con icono
- Acepta: video/webm, video/mp4, video/avi, video/quicktime
- Límite: 10 MB
- Botón "Volver" a instrucciones

**Estado 'preview':**
- Preview del video con controles HTML5
- Información del archivo (nombre, tamaño, tipo)
- Botones: "Cambiar Video" | "Analizar Video"

## Flujos de Usuario

### Flujo 1: Grabar Video en Vivo (Existente)
1. Abrir modal
2. Seleccionar "Grabar video en vivo"
3. Aceptar consentimiento
4. Clic "Comenzar Grabación"
5. Solicitar permisos de cámara/micrófono
6. Ver preview de cámara
7. Clic "Iniciar Grabación"
8. Countdown 3-2-1
9. Grabar 4 segundos automáticamente
10. Procesar → Mostrar resultado

### Flujo 2: Subir Video Grabado (Nuevo)
1. Abrir modal
2. Seleccionar "Subir video grabado"
3. Aceptar consentimiento
4. Clic "Seleccionar Video"
5. Clic en área de upload
6. Seleccionar archivo del sistema
7. Ver preview del video
8. Clic "Analizar Video"
9. Procesar → Mostrar resultado

## Validaciones

### Frontend
- ✅ Tipo de archivo: `file.type.startsWith('video/')`
- ✅ Tamaño: `file.size <= 10 MB`
- ✅ Formatos aceptados via HTML: `.webm`, `.mp4`, `.avi`, `.mov`

### Backend (Ya Existentes)
- ✅ Multer fileFilter valida extensiones y mimetypes
- ✅ Límite de tamaño configurado en multer
- ✅ Validación de campo 'video' requerido

## Compatibilidad

### ¿Por qué funciona sin cambios en backend?

1. **`File` extiende `Blob`** en JavaScript
   - `avSyncService.scoreVideo()` acepta `Blob`
   - Un `File` es un tipo de `Blob` con metadatos adicionales
   - Funciona transparentemente

2. **Backend ya acepta múltiples formatos**
   - Línea 47 en `server/api/avsync.js`: `/\.(webm|mp4|avi|mov)$/i`
   - Línea 46: `file.mimetype.startsWith('video/')`
   - No requiere cambios

3. **Mismo análisis**
   - SyncNet recibe la ruta al archivo
   - No le importa si llegó vía MediaRecorder o File input
   - Mismo pipeline de procesamiento

## Testing

### Pruebas Manuales Recomendadas

#### Modo Live:
1. Abrir app en http://localhost:5173
2. Activar modal de verificación
3. Seleccionar "Grabar video en vivo"
4. Verificar que funciona como antes

#### Modo Upload:
1. Abrir modal de verificación
2. Seleccionar "Subir video grabado"
3. **Test 1: Video válido**
   - Subir video .mp4 de <10 MB
   - Verificar preview
   - Analizar y verificar resultado
4. **Test 2: Archivo muy grande**
   - Intentar subir video >10 MB
   - Verificar que muestra error
5. **Test 3: Formato inválido**
   - Intentar subir imagen .jpg
   - Verificar que muestra error
6. **Test 4: Cambiar video**
   - Subir un video
   - Clic "Cambiar Video"
   - Subir otro video
   - Verificar que funciona

### Verificar Logs

Buscar en console del navegador:
```
[AVSyncChallenge] File selected
[AVSyncChallenge] Processing video... mode: upload
[AVSyncChallenge] Analysis complete
```

Buscar en logs del backend:
```
[AVSync] Processing video: { filename, size, mimetype }
[AVSync] Forwarding to Python service
[AVSync] Result: { score, decision }
```

## Formatos Soportados

| Formato | Extensión | MIME Type | Soporte |
|---------|-----------|-----------|---------|
| WebM | .webm | video/webm | ✅ |
| MP4 | .mp4 | video/mp4 | ✅ |
| AVI | .avi | video/x-msvideo | ✅ |
| QuickTime | .mov | video/quicktime | ✅ |

## Estadísticas de Cambios

- **Archivo modificado**: 1
- **Líneas agregadas**: ~180
- **Líneas modificadas**: ~30
- **Total de cambios**: ~210 líneas
- **Imports agregados**: 1 (`Upload` de lucide-react)
- **Estados nuevos**: 2 (`uploadMode`, `uploadedFile`)
- **Handlers nuevos**: 1 (`handleFileSelect`)
- **Estados UI nuevos**: 2 (`file-select`, `preview`)

## Ventajas de la Implementación

1. ✅ **Cero cambios en backend** - Reutiliza infraestructura existente
2. ✅ **Cero cambios en servicios** - avSyncService funciona con ambos modos
3. ✅ **Un solo archivo modificado** - Fácil de mantener y revisar
4. ✅ **Mismo análisis** - Resultados consistentes para ambos modos
5. ✅ **Backwards compatible** - Modo live sigue funcionando exactamente igual
6. ✅ **Mejor UX** - Usuario elige cómo verificar su identidad
7. ✅ **Fácil testing** - Permite pruebas con videos pregrabados
8. ✅ **Código limpio** - Lógica clara y separada por modo

## Próximos Pasos (Opcionales)

### Mejoras Futuras
- [ ] Drag & drop en área de upload
- [ ] Indicador de progreso durante upload
- [ ] Validar duración mínima del video (4+ segundos)
- [ ] Mostrar thumbnail antes del preview completo
- [ ] Agregar opción de recortar video si es muy largo

### Deployment
- El código ya está listo para deployment en Render
- No requiere cambios en `render.yaml`
- No requiere nuevas variables de entorno

## Conclusión

La funcionalidad de upload de archivos ha sido implementada exitosamente siguiendo los principios de:
- Reutilización de código existente
- Mínimos cambios (un solo archivo)
- Misma calidad de análisis
- Experiencia de usuario mejorada

**Estado**: ✅ COMPLETO Y LISTO PARA TESTING
