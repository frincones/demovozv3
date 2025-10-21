"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

interface OrbProps {
  intensity?: number;
  className?: string;
  onClick?: () => void;
  // Props from parent to control the orb
  currentVolume?: number;
  isSessionActive?: boolean;
  connectionStatus?: 'disconnected' | 'requesting_mic' | 'fetching_token' | 'establishing_connection' | 'connected' | 'error';
  isSpeaking?: boolean;
}

const Orb: React.FC<OrbProps> = ({
  intensity = 3,
  className = "",
  onClick,
  currentVolume = 0,
  isSessionActive = false,
  connectionStatus = 'disconnected',
  isSpeaking = false
}) => {

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const wireframeRef = useRef<THREE.LineSegments | null>(null);
  const glowMeshRef = useRef<THREE.Mesh | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const particlePositionsRef = useRef<Float32Array | null>(null);
  const noise = createNoise3D();

  useEffect(() => {
    initViz();
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isSessionActive && ballRef.current) {
      // Use a minimum volume for breathing effect when agent is speaking
      const effectiveVolume = isSpeaking ? Math.max(currentVolume, 0.3) : currentVolume;
      updateBallMorph(ballRef.current, effectiveVolume);

      // Also update wireframe and glow mesh morphing
      if (wireframeRef.current) {
        updateWireframeMorph(wireframeRef.current, effectiveVolume);
      }
      if (glowMeshRef.current) {
        updateBallMorph(glowMeshRef.current, effectiveVolume);
      }
    } else if (
      !isSessionActive &&
      ballRef.current &&
      originalPositionsRef.current
    ) {
      resetBallMorph(ballRef.current, originalPositionsRef.current);

      // Reset wireframe and glow mesh too
      if (wireframeRef.current) {
        resetWireframeMorph(wireframeRef.current, originalPositionsRef.current);
      }
      if (glowMeshRef.current) {
        resetBallMorph(glowMeshRef.current, originalPositionsRef.current);
      }
    }
  }, [currentVolume, isSessionActive, isSpeaking, intensity]);

  const cleanup = () => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    if (sceneRef.current) {
      sceneRef.current.clear();
    }
  };

  const initViz = () => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(
      20,
      1,
      1,
      100,
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(scene.position);

    scene.add(camera);
    sceneRef.current = scene;
    groupRef.current = group;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    // Clear any existing renderer
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    // Set renderer size to match container width with proper scaling
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const size = Math.min(width, height);
    renderer.setSize(size, size);

    // Style the canvas element to maintain aspect ratio and center
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.objectFit = 'contain';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.margin = 'auto';

    rendererRef.current = renderer;

    // Create the icosahedron geometry - this creates the beautiful faceted sphere
    const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 8);

    // Futuristic color system based on connection status
    const getFuturisticColors = () => {
      switch (connectionStatus) {
        case 'connected':
          return {
            base: 0x2050F0,    // Electric blue
            emissive: 0xFF20FF, // Neon magenta
            intensity: 0.4
          };
        case 'requesting_mic':
        case 'fetching_token':
        case 'establishing_connection':
          return {
            base: 0x801090,    // Neon violet
            emissive: 0x6A00FF, // Purple blend
            intensity: 0.3
          };
        case 'error':
          return {
            base: 0xFF20FF,    // Neon magenta
            emissive: 0xF040F0, // Vivid fuchsia
            intensity: 0.5
          };
        default:
          return {
            base: 0x0C0722,    // Base dark
            emissive: 0x2020A0, // Deep blue
            intensity: 0.1
          };
      }
    };

    const colors = getFuturisticColors();

    // Create both solid mesh and wireframe edges for complete color control
    // 1. Invisible base mesh for morphing functionality
    const baseMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false
    });
    const ball = new THREE.Mesh(icosahedronGeometry, baseMaterial);

    // 2. Wireframe with gradient color control using EdgesGeometry
    const edgesGeometry = new THREE.EdgesGeometry(icosahedronGeometry);

    // Create gradient-like effect by using vertex colors
    const edgePositions = edgesGeometry.getAttribute('position');
    const edgeColors = new Float32Array(edgePositions.count * 3);

    // Apply gradient from electric blue to magenta based on vertex position
    for (let i = 0; i < edgePositions.count; i++) {
      const y = edgePositions.getY(i);
      const normalizedY = (y + 10) / 20; // Normalize to 0-1 range

      // Gradient from electric blue (bottom) to magenta (top)
      const r = 0.125 + normalizedY * 0.875; // 0.125 (blue) to 1.0 (magenta)
      const g = 0.31 * (1 - normalizedY) + normalizedY * 0.13; // 0.31 (blue) to 0.13 (magenta)
      const b = 0.94 + normalizedY * 0.06; // 0.94 (blue) to 1.0 (magenta)

      edgeColors[i * 3] = r;
      edgeColors[i * 3 + 1] = g;
      edgeColors[i * 3 + 2] = b;
    }

    edgesGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));

    const wireframeMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 1.0
    });
    const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);

    // 3. Inner glow mesh for emissive effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.emissive),
      transparent: true,
      opacity: Math.max(colors.intensity * 0.4, 0.2), // Ensure minimum visibility
      blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(icosahedronGeometry.clone(), glowMaterial);
    glowMesh.scale.setScalar(0.98); // Slightly smaller for inner glow effect

    ball.position.set(0, 0, 0);
    wireframe.position.set(0, 0, 0);
    glowMesh.position.set(0, 0, 0);

    ballRef.current = ball;
    wireframeRef.current = wireframe;
    glowMeshRef.current = glowMesh;

    // Store the original positions of the vertices for smooth animation
    const positionAttribute = ball.geometry.getAttribute('position');
    originalPositionsRef.current = new Float32Array(positionAttribute.array);

    // Add all elements to the group
    group.add(ball);
    group.add(wireframe);
    group.add(glowMesh);

    // Create particle halo system
    const particleCount = 120;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    // Initialize particles in a spherical distribution
    for (let i = 0; i < particleCount; i++) {
      const radius = 15 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      // Color gradient from electric blue to magenta
      const colorBlend = Math.random();
      particleColors[i * 3] = 0.125 + colorBlend * 0.875;     // R: 0.125 to 1.0
      particleColors[i * 3 + 1] = 0.31 * (1 - colorBlend) + colorBlend * 0.13; // G: 0.31 to 0.13
      particleColors[i * 3 + 2] = 1.0;                        // B: constant 1.0
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.8,
      transparent: true,
      opacity: 0.6,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.1
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particlesRef.current = particles;
    particlePositionsRef.current = particlePositions;
    group.add(particles);

    // Enhanced lighting setup for futuristic rendering
    // Subtle ambient base light
    const ambientLight = new THREE.AmbientLight(0x0C0722, 0.3); // Dark purple base
    scene.add(ambientLight);

    // Primary electric blue light
    const primaryLight = new THREE.SpotLight(0x2050F0, 1.2);
    primaryLight.position.set(-15, 30, 25);
    primaryLight.angle = Math.PI / 6;
    primaryLight.penumbra = 0.3;
    primaryLight.lookAt(ball.position);
    scene.add(primaryLight);

    // Secondary magenta rim light
    const rimLight = new THREE.SpotLight(0xFF20FF, 0.8);
    rimLight.position.set(15, -20, 15);
    rimLight.angle = Math.PI / 5;
    rimLight.penumbra = 0.5;
    rimLight.lookAt(ball.position);
    scene.add(rimLight);

    // Accent violet fill light
    const fillLight = new THREE.DirectionalLight(0x801090, 0.4);
    fillLight.position.set(0, 0, 30);
    scene.add(fillLight);

    scene.add(group);

    render();
  };

  const render = () => {
    if (
      !groupRef.current ||
      !ballRef.current ||
      !cameraRef.current ||
      !rendererRef.current ||
      !sceneRef.current
    ) {
      return;
    }

    // Continuous rotation for visual appeal
    groupRef.current.rotation.y += 0.005;

    // Animate particles
    if (particlesRef.current && particlePositionsRef.current) {
      const time = performance.now() * 0.001;
      const positions = particlesRef.current.geometry.getAttribute('position');
      const originalPositions = particlePositionsRef.current;

      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;
        const x = originalPositions[i3];
        const y = originalPositions[i3 + 1];
        const z = originalPositions[i3 + 2];

        // Slow orbital motion + audio responsive movement
        const angle = time * 0.2 + i * 0.1;
        const audioInfluence = isSessionActive ? currentVolume * 3 : 0;

        positions.setX(i, x + Math.sin(angle) * (1 + audioInfluence));
        positions.setY(i, y + Math.cos(angle * 0.7) * (1 + audioInfluence));
        positions.setZ(i, z + Math.sin(angle * 0.5) * (1 + audioInfluence));
      }

      positions.needsUpdate = true;

      // Update particle opacity based on session state
      if (particlesRef.current.material instanceof THREE.PointsMaterial) {
        const targetOpacity = isSessionActive ? 0.8 : 0.4;
        particlesRef.current.material.opacity += (targetOpacity - particlesRef.current.material.opacity) * 0.05;
      }
    }

    // Update wireframe and glow colors based on connection status (futuristic theme)
    const colors = (() => {
      switch (connectionStatus) {
        case 'connected':
          return {
            base: 0x2050F0,    // Electric blue
            emissive: 0xFF20FF, // Neon magenta
            intensity: 0.4 + (currentVolume * 0.3) // Volume responsive intensity
          };
        case 'requesting_mic':
        case 'fetching_token':
        case 'establishing_connection':
          return {
            base: 0x801090,    // Neon violet
            emissive: 0x6A00FF, // Purple blend
            intensity: 0.3 + Math.sin(Date.now() * 0.003) * 0.1 // Pulsing effect
          };
        case 'error':
          return {
            base: 0xFF20FF,    // Neon magenta
            emissive: 0xF040F0, // Vivid fuchsia
            intensity: 0.5 + Math.sin(Date.now() * 0.005) * 0.2 // Error pulsing
          };
        default:
          return {
            base: 0x0C0722,    // Base dark
            emissive: 0x2020A0, // Deep blue
            intensity: 0.1
          };
      }
    })();

    // Update wireframe gradient colors dynamically based on connection status
    if (wireframeRef.current && wireframeRef.current.geometry) {
      const colorAttribute = wireframeRef.current.geometry.getAttribute('color');
      if (colorAttribute) {
        const positionAttribute = wireframeRef.current.geometry.getAttribute('position');

        // Always use the same gradient colors regardless of connection status
        // This ensures wireframe colors remain identical in all states
        const topColor = { r: 1.0, g: 0.13, b: 1.0 }; // Magenta (top)
        const bottomColor = { r: 0.125, g: 0.31, b: 0.94 }; // Electric blue (bottom)

        // Update gradient colors for each vertex
        for (let i = 0; i < positionAttribute.count; i++) {
          const y = positionAttribute.getY(i);
          const normalizedY = (y + 10) / 20; // Normalize to 0-1 range

          // Interpolate between bottom and top colors
          const r = bottomColor.r + normalizedY * (topColor.r - bottomColor.r);
          const g = bottomColor.g + normalizedY * (topColor.g - bottomColor.g);
          const b = bottomColor.b + normalizedY * (topColor.b - bottomColor.b);

          colorAttribute.setXYZ(i, r, g, b);
        }

        colorAttribute.needsUpdate = true;
      }

      // Update wireframe visibility and opacity
      if (wireframeRef.current.material instanceof THREE.LineBasicMaterial) {
        wireframeRef.current.material.opacity = connectionStatus === 'connected' ? 1.0 : 0.8;
        wireframeRef.current.visible = true;
      }
    }

    // Update glow mesh color and intensity - ensure visibility
    if (glowMeshRef.current && glowMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
      glowMeshRef.current.material.color.setHex(colors.emissive);
      glowMeshRef.current.material.opacity = Math.max(colors.intensity * 0.4, 0.2); // Ensure minimum visibility
      glowMeshRef.current.visible = true;
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestAnimationFrame(render);
  };

  const onWindowResize = () => {
    if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const size = Math.min(width, height);
    rendererRef.current.setSize(size, size);

    cameraRef.current.aspect = 1;
    cameraRef.current.updateProjectionMatrix();
  };

  const updateBallMorph = (mesh: THREE.Mesh, volume: number) => {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");

    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i),
      );

      const offset = 10; // Base radius of the icosahedron
      const amp = 2.5; // Amplitude for dramatic effect
      const time = window.performance.now();
      vertex.normalize();

      // Noise frequency - controls the organic movement
      const rf = 0.00001;

      // Calculate the distance from center with noise and volume influence
      const distance =
        offset +
        volume * 4 * intensity + // Volume effect amplified by intensity
        noise(
          vertex.x + time * rf * 7,
          vertex.y + time * rf * 8,
          vertex.z + time * rf * 9,
        ) *
          amp *
          volume * intensity; // Noise effect also amplified

      vertex.multiplyScalar(distance);

      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  const resetBallMorph = (
    mesh: THREE.Mesh,
    originalPositions: Float32Array,
  ) => {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");

    for (let i = 0; i < positionAttribute.count; i++) {
      positionAttribute.setXYZ(
        i,
        originalPositions[i * 3],
        originalPositions[i * 3 + 1],
        originalPositions[i * 3 + 2],
      );
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  const updateWireframeMorph = (wireframe: THREE.LineSegments, volume: number) => {
    const geometry = wireframe.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute("position");

    // Get the morphed positions from the main ball
    if (ballRef.current) {
      const ballGeometry = ballRef.current.geometry as THREE.BufferGeometry;
      const ballPositions = ballGeometry.getAttribute("position");

      // Update wireframe positions to match ball morphing
      for (let i = 0; i < positionAttribute.count; i++) {
        const ballIndex = Math.floor(i / 2); // Each edge connects 2 vertices
        if (ballIndex < ballPositions.count) {
          positionAttribute.setXYZ(
            i,
            ballPositions.getX(ballIndex),
            ballPositions.getY(ballIndex),
            ballPositions.getZ(ballIndex)
          );
        }
      }

      // Update gradient colors based on new positions and connection status
      const colorAttribute = geometry.getAttribute("color");
      if (colorAttribute) {
        // Always use the same gradient colors regardless of connection status
        const topColor = { r: 1.0, g: 0.13, b: 1.0 }; // Magenta (top)
        const bottomColor = { r: 0.125, g: 0.31, b: 0.94 }; // Electric blue (bottom)

        for (let i = 0; i < positionAttribute.count; i++) {
          const y = positionAttribute.getY(i);
          const normalizedY = (y + 15) / 30; // Adjust range for morphed geometry

          // Interpolate between bottom and top colors
          const r = bottomColor.r + normalizedY * (topColor.r - bottomColor.r);
          const g = bottomColor.g + normalizedY * (topColor.g - bottomColor.g);
          const b = bottomColor.b + normalizedY * (topColor.b - bottomColor.b);

          colorAttribute.setXYZ(i, r, g, b);
        }
        colorAttribute.needsUpdate = true;
      }

      positionAttribute.needsUpdate = true;
    }
  };

  const resetWireframeMorph = (wireframe: THREE.LineSegments, originalPositions: Float32Array) => {
    // Recreate the wireframe geometry from the original geometry with gradient colors
    if (ballRef.current) {
      const originalGeometry = new THREE.IcosahedronGeometry(10, 8);
      const edgesGeometry = new THREE.EdgesGeometry(originalGeometry);

      // Recreate gradient colors
      const edgePositions = edgesGeometry.getAttribute('position');
      const edgeColors = new Float32Array(edgePositions.count * 3);

      // Always use the same gradient colors regardless of connection status
      const topColor = { r: 1.0, g: 0.13, b: 1.0 }; // Magenta (top)
      const bottomColor = { r: 0.125, g: 0.31, b: 0.94 }; // Electric blue (bottom)

      for (let i = 0; i < edgePositions.count; i++) {
        const y = edgePositions.getY(i);
        const normalizedY = (y + 10) / 20; // Normalize to 0-1 range

        // Interpolate between bottom and top colors
        const r = bottomColor.r + normalizedY * (topColor.r - bottomColor.r);
        const g = bottomColor.g + normalizedY * (topColor.g - bottomColor.g);
        const b = bottomColor.b + normalizedY * (topColor.b - bottomColor.b);

        edgeColors[i * 3] = r;
        edgeColors[i * 3 + 1] = g;
        edgeColors[i * 3 + 2] = b;
      }

      edgesGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));

      wireframe.geometry.dispose();
      wireframe.geometry = edgesGeometry;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const getStatusText = () => {
    if (isSessionActive) {
      return "Listening... Click to stop";
    }
    switch (connectionStatus) {
      case 'requesting_mic':
        return "Requesting microphone access...";
      case 'fetching_token':
        return "Connecting to Lirvana...";
      case 'establishing_connection':
        return "Establishing connection...";
      case 'error':
        return "Error - Click to retry";
      default:
        return "Click to start conversation";
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div
        ref={containerRef}
        className="hover:cursor-pointer aspect-square w-full max-w-96 transition-all duration-300 hover:scale-105"
        onClick={handleClick}
        style={{
          filter: (() => {
            switch (connectionStatus) {
              case 'connected':
                return isSessionActive
                  ? 'drop-shadow(0 0 40px rgba(32, 80, 240, 0.8)) drop-shadow(0 0 80px rgba(255, 32, 255, 0.6))'
                  : 'drop-shadow(0 0 30px rgba(32, 80, 240, 0.6))';
              case 'requesting_mic':
              case 'fetching_token':
              case 'establishing_connection':
                return 'drop-shadow(0 0 35px rgba(128, 16, 144, 0.7)) drop-shadow(0 0 70px rgba(106, 0, 255, 0.5))';
              case 'error':
                return 'drop-shadow(0 0 45px rgba(255, 32, 255, 0.9)) drop-shadow(0 0 90px rgba(240, 64, 240, 0.6))';
              default:
                return 'drop-shadow(0 0 25px rgba(12, 7, 34, 0.5))';
            }
          })(),
          transition: 'filter 0.3s ease'
        }}
      />

      {/* Status indicator */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          {getStatusText()}
        </p>


        {/* Connection status for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground opacity-50">
            Status: {connectionStatus} | Volume: {currentVolume.toFixed(3)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orb;