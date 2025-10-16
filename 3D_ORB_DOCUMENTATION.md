# 3D Orb UI - Technical Documentation

## Resumen Ejecutivo

Este documento detalla la implementación completa de la interfaz de usuario de orbe 3D desarrollada para la aplicación Lirvana. El sistema incluye dos componentes principales: un orbe 3D completo y una versión mini, ambos construidos con Three.js y que responden dinámicamente al audio y estados de conexión.

## Arquitectura General

### Estructura de Componentes

```
src/components/
├── 3d-orb.tsx          # Componente principal del orbe 3D
├── 3d-orb-mini.tsx     # Versión miniaturizada del orbe
└── VoiceOrb.tsx        # Orbe alternativo con Framer Motion
```

## Tecnologías y Dependencias

### Librerías Principales

```json
{
  "three": "^0.165.0",
  "@types/three": "^0.165.0",
  "simplex-noise": "^4.0.1",
  "framer-motion": "^12.23.22",
  "react": "^18.3.1",
  "typescript": "^5.8.3"
}
```

### Dependencias del Sistema de Diseño

```json
{
  "tailwindcss": "^3.4.17",
  "tailwindcss-animate": "^1.0.7",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0"
}
```

## Componente Principal: 3D Orb

### 1. Archivo: `src/components/3d-orb.tsx`

#### Interfaces y Props

```typescript
interface OrbProps {
  intensity?: number;
  className?: string;
  onClick?: () => void;
  currentVolume?: number;
  isSessionActive?: boolean;
  connectionStatus?: 'disconnected' | 'requesting_mic' | 'fetching_token' | 'establishing_connection' | 'connected' | 'error';
  isSpeaking?: boolean;
}
```

#### Imports Necesarios

```typescript
"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
```

#### Configuración de Three.js

##### Geometría
- **Tipo:** IcosahedronGeometry
- **Radio:** 10 unidades
- **Subdivisiones:** 8 niveles
- **Propósito:** Crear una esfera facetada de alta calidad

##### Cámara
- **Tipo:** PerspectiveCamera
- **FOV:** 20 grados
- **Posición:** (0, 0, 100)
- **Aspecto:** 1:1 (cuadrado)

##### Material
- **Tipo:** MeshLambertMaterial
- **Wireframe:** true
- **Color dinámico:** Basado en estado de conexión

##### Sistema de Iluminación
```typescript
// Luz ambiental
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

// Luz direccional
const spotLight = new THREE.SpotLight(0xffffff);
spotLight.intensity = 0.9;
spotLight.position.set(-10, 40, 20);
spotLight.castShadow = true;
```

#### Sistema de Colores

```typescript
const getOrbColor = () => {
  switch (connectionStatus) {
    case 'connected':
      return 0xffffff; // Blanco - conectado
    case 'requesting_mic':
    case 'fetching_token':
    case 'establishing_connection':
      return 0x666666; // Gris - conectando
    case 'error':
      return 0x333333; // Gris oscuro - error
    default:
      return 0x999999; // Gris medio - desconectado
  }
};
```

#### Animaciones y Efectos

##### Morphing Dinámico con Simplex Noise
```typescript
const updateBallMorph = (mesh: THREE.Mesh, volume: number) => {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const positionAttribute = geometry.getAttribute("position");

  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new THREE.Vector3(
      positionAttribute.getX(i),
      positionAttribute.getY(i),
      positionAttribute.getZ(i),
    );

    const offset = 10; // Radio base
    const amp = 2.5; // Amplitud para efecto dramático
    const time = window.performance.now();
    vertex.normalize();

    const rf = 0.00001; // Frecuencia de ruido

    const distance =
      offset +
      volume * 4 * intensity + // Efecto de volumen
      noise(
        vertex.x + time * rf * 7,
        vertex.y + time * rf * 8,
        vertex.z + time * rf * 9,
      ) *
        amp *
        volume * intensity;

    vertex.multiplyScalar(distance);
    positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
};
```

##### Rotación Continua
```typescript
// En el bucle de renderizado
groupRef.current.rotation.y += 0.005;
```

#### Efectos Visuales con CSS

##### Drop Shadow Dinámico
```typescript
style={{
  filter: isSessionActive
    ? 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 40px rgba(255, 255, 255, 0.2))'
    : connectionStatus !== 'disconnected'
    ? 'drop-shadow(0 0 15px rgba(150, 150, 150, 0.3))'
    : 'none',
  transition: 'filter 0.3s ease'
}}
```

##### Interacciones
```typescript
className="hover:cursor-pointer aspect-square w-full max-w-96 transition-all duration-300 hover:scale-105"
```

## Componente Mini: 3D Orb Mini

### 1. Archivo: `src/components/3d-orb-mini.tsx`

#### Diferencias Clave con el Componente Principal

##### Geometría Reducida
- **Radio:** 6 unidades (vs 10)
- **Subdivisiones:** 6 niveles (vs 8)
- **Posición de cámara:** (0, 0, 60) - más cerca

##### Efectos Reducidos
- **Amplitud de morphing:** 1.5 (vs 2.5)
- **Multiplicador de volumen:** 2 (vs 4)
- **Rotación más rápida:** 0.01 (vs 0.005)

##### Iluminación Suavizada
```typescript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Más intensa
const spotLight = new THREE.SpotLight(0xffffff);
spotLight.intensity = 0.7; // Más suave
spotLight.position.set(-5, 20, 10); // Más cerca
```

## Sistema de Diseño y Colores

### Variables CSS (src/index.css)

```css
:root {
  /* Colores principales */
  --primary: 220 100% 60%;
  --primary-glow: 220 100% 70%;
  --accent: 180 100% 60%;
  --accent-glow: 180 100% 70%;

  /* Gradientes */
  --gradient-primary: linear-gradient(135deg, hsl(220 100% 60%) 0%, hsl(260 100% 60%) 100%);
  --gradient-accent: linear-gradient(135deg, hsl(180 100% 60%) 0%, hsl(200 100% 70%) 100%);
  --gradient-hero: linear-gradient(180deg, hsl(240 10% 3.9%) 0%, hsl(240 15% 8%) 50%, hsl(240 10% 3.9%) 100%);

  /* Sombras */
  --shadow-glow: 0 0 60px hsl(220 100% 60% / 0.3);
  --shadow-glow-accent: 0 0 60px hsl(180 100% 60% / 0.3);
  --shadow-elegant: 0 20px 60px -10px hsl(240 10% 3.9% / 0.8);
}
```

### Configuración de Tailwind (tailwind.config.ts)

```typescript
extend: {
  colors: {
    primary: {
      DEFAULT: "hsl(var(--primary))",
      foreground: "hsl(var(--primary-foreground))",
      glow: "hsl(var(--primary-glow))",
    },
    accent: {
      DEFAULT: "hsl(var(--accent))",
      foreground: "hsl(var(--accent-foreground))",
      glow: "hsl(var(--accent-glow))",
    },
  },
  keyframes: {
    "pulse-glow": {
      "0%, 100%": {
        opacity: "1",
        transform: "scale(1)",
        filter: "blur(0px)",
      },
      "50%": {
        opacity: "0.8",
        transform: "scale(1.05)",
        filter: "blur(2px)",
      },
    },
    "breathe": {
      "0%, 100%": { transform: "scale(1)", opacity: "1" },
      "50%": { transform: "scale(1.08)", opacity: "0.9" },
    },
  },
  animation: {
    "pulse-glow": "pulse-glow 3s ease-in-out infinite",
    "breathe": "breathe 4s ease-in-out infinite",
  },
  backgroundImage: {
    "gradient-primary": "var(--gradient-primary)",
    "gradient-accent": "var(--gradient-accent)",
    "gradient-hero": "var(--gradient-hero)",
  },
  boxShadow: {
    "glow": "var(--shadow-glow)",
    "glow-accent": "var(--shadow-glow-accent)",
    "elegant": "var(--shadow-elegant)",
  },
}
```

## Componente Alternativo: VoiceOrb

### 1. Archivo: `src/components/VoiceOrb.tsx`

Este componente usa Framer Motion en lugar de Three.js:

```typescript
import { motion } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";

// Efectos de anillos concéntricos
<motion.div
  className="absolute w-64 h-64 rounded-full bg-primary/20"
  animate={{
    scale: isActive ? [1, 1.3, 1] : 1,
    opacity: isActive ? [0.5, 0.2, 0.5] : 0.3,
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  }}
  style={{
    filter: `blur(20px)`,
    boxShadow: "var(--shadow-glow)",
  }}
/>
```

## Implementación en la Aplicación

### Uso en Index.tsx

```typescript
import Orb from "@/components/3d-orb";

<Orb
  intensity={3}
  className="w-64 h-64 md:w-96 md:h-96 max-w-[90vw] max-h-[90vw]"
  onClick={handleOrbClick}
  currentVolume={lirvana.audioLevel}
  isSessionActive={lirvana.isConnected}
  connectionStatus={lirvana.connectionStatus}
  isSpeaking={lirvana.isSpeaking}
/>
```

## Estructura de Archivos Necesarios

```
proyecto/
├── package.json                    # Dependencias
├── tailwind.config.ts             # Configuración de Tailwind
├── src/
│   ├── index.css                  # Variables CSS globales
│   ├── components/
│   │   ├── 3d-orb.tsx            # Orbe principal
│   │   ├── 3d-orb-mini.tsx       # Orbe mini
│   │   └── VoiceOrb.tsx          # Orbe alternativo
│   └── lib/
│       └── utils.ts              # Utilidades (cn function)
```

## Comandos de Instalación

```bash
# Dependencias principales
npm install three @types/three simplex-noise

# Framer Motion (opcional para VoiceOrb)
npm install framer-motion

# Sistema de diseño
npm install tailwindcss tailwindcss-animate
npm install class-variance-authority clsx tailwind-merge

# Iconos (para VoiceOrb)
npm install lucide-react
```

## Estados y Comportamientos

### Estados de Conexión
1. **disconnected** - Gris medio (#999999)
2. **requesting_mic** - Gris (#666666)
3. **fetching_token** - Gris (#666666)
4. **establishing_connection** - Gris (#666666)
5. **connected** - Blanco (#ffffff)
6. **error** - Gris oscuro (#333333)

### Respuesta al Audio
- **Sin audio:** Forma base del icosaedro
- **Con audio:** Deformación orgánica usando Simplex noise
- **Agente hablando:** Volumen mínimo de 0.3 para efecto de respiración
- **Usuario hablando:** Respuesta directa al volumen detectado

### Interacciones
- **Hover:** Escala 1.05 con transición suave
- **Click:** Función personalizable
- **Estados visuales:** Drop shadows dinámicos

## Configuración de Rendering

### WebGL Renderer
```typescript
const renderer = new THREE.WebGLRenderer({
  alpha: true,      // Fondo transparente
  antialias: true   // Suavizado de bordes
});
```

### Responsive Design
```typescript
const width = containerRef.current.clientWidth;
const height = containerRef.current.clientHeight;
const size = Math.min(width, height);
renderer.setSize(size, size);
```

## Consideraciones de Performance

1. **Cleanup de recursos:** Dispose de renderer y clear de scene
2. **RequestAnimationFrame:** Bucle de renderizado optimizado
3. **Responsive handling:** Event listeners para resize
4. **Selective updates:** Solo actualizar geometría cuando necesario

## Personalización

### Parámetros Ajustables

#### En 3d-orb.tsx:
- `intensity`: Multiplicador de efectos (default: 3)
- `offset`: Radio base del icosaedro (10)
- `amp`: Amplitud del morphing (2.5)
- `rf`: Frecuencia del ruido (0.00001)

#### En 3d-orb-mini.tsx:
- `intensity`: Multiplicador de efectos (default: 2)
- `offset`: Radio base reducido (6)
- `amp`: Amplitud reducida (1.5)

### Colores Personalizables
Modificar las variables CSS en `src/index.css` para cambiar la paleta de colores completa del sistema.

---

**Nota:** Esta implementación está optimizada para aplicaciones web modernas con soporte para WebGL y ECMAScript modules. Requiere React 18+ y TypeScript para máxima compatibilidad.