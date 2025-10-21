"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

interface OrbMiniProps {
  intensity?: number;
  className?: string;
  onClick?: () => void;
  // Props from parent to control the orb
  currentVolume?: number;
  isSessionActive?: boolean;
  connectionStatus?: 'disconnected' | 'requesting_mic' | 'fetching_token' | 'establishing_connection' | 'connected' | 'error';
  isSpeaking?: boolean;
  isListening?: boolean;
}

const OrbMini: React.FC<OrbMiniProps> = ({
  intensity = 2,
  className = "",
  onClick,
  currentVolume = 0,
  isSessionActive = false,
  connectionStatus = 'disconnected',
  isSpeaking = false,
  isListening = false
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
      const effectiveVolume = isSpeaking ? Math.max(currentVolume, 0.2) :
                             isListening ? Math.max(currentVolume, 0.15) : currentVolume;
      updateBallMorph(ballRef.current, effectiveVolume);
    } else if (
      !isSessionActive &&
      ballRef.current &&
      originalPositionsRef.current
    ) {
      resetBallMorph(ballRef.current, originalPositionsRef.current);
    }
  }, [currentVolume, isSessionActive, isSpeaking, isListening, intensity]);

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
    camera.position.set(0, 0, 60); // Closer for mini version

    scene.add(camera);
    sceneRef.current = scene;
    groupRef.current = group;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    // Clear any existing renderer
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    // Set renderer size to match container width with proper scaling (smaller for mini)
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

    // Create smaller icosahedron for mini version
    const icosahedronGeometry = new THREE.IcosahedronGeometry(6, 6);

    // Futuristic color system for mini orb
    const getFuturisticColors = () => {
      switch (connectionStatus) {
        case 'connected':
          return {
            base: 0x2050F0,    // Electric blue
            emissive: 0xFF20FF, // Neon magenta
            intensity: 0.3
          };
        case 'requesting_mic':
        case 'fetching_token':
        case 'establishing_connection':
          return {
            base: 0x801090,    // Neon violet
            emissive: 0x6A00FF, // Purple blend
            intensity: 0.25
          };
        case 'error':
          return {
            base: 0xFF20FF,    // Neon magenta
            emissive: 0xF040F0, // Vivid fuchsia
            intensity: 0.4
          };
        default:
          return {
            base: 0x0C0722,    // Base dark
            emissive: 0x2020A0, // Deep blue
            intensity: 0.08
          };
      }
    };

    const colors = getFuturisticColors();

    // Create dual-geometry system for mini orb like main orb
    // 1. Invisible base mesh for morphing functionality
    const baseMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false
    });
    const ball = new THREE.Mesh(icosahedronGeometry, baseMaterial);

    // 2. Wireframe with solid bright color for mini orb
    const edgesGeometry = new THREE.EdgesGeometry(icosahedronGeometry);

    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x20FFFF, // Bright cyan-magenta color that should always be visible
      linewidth: 1.5,
      transparent: true,
      opacity: 1.0
    });
    const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);

    // 3. Inner glow mesh for emissive effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.emissive),
      transparent: true,
      opacity: Math.min(colors.intensity * 0.2, 0.1), // Reduced for mini orb
      blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(icosahedronGeometry.clone(), glowMaterial);
    glowMesh.scale.setScalar(0.98);

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

    // Create simpler particle halo for mini version
    const particleCount = 60; // Fewer particles for mini
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    // Initialize particles in a smaller spherical distribution
    for (let i = 0; i < particleCount; i++) {
      const radius = 9 + Math.random() * 4; // Smaller radius for mini
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      // Color gradient from electric blue to magenta (same as main)
      const colorBlend = Math.random();
      particleColors[i * 3] = 0.125 + colorBlend * 0.875;
      particleColors[i * 3 + 1] = 0.31 * (1 - colorBlend) + colorBlend * 0.13;
      particleColors[i * 3 + 2] = 1.0;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.5, // Smaller particles for mini
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.1
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particlesRef.current = particles;
    group.add(particles);

    // Enhanced lighting setup for mini futuristic rendering
    // Subtle ambient base light (softer for mini)
    const ambientLight = new THREE.AmbientLight(0x0C0722, 0.4); // Dark purple base
    scene.add(ambientLight);

    // Primary electric blue light (reduced intensity for mini)
    const primaryLight = new THREE.SpotLight(0x2050F0, 0.8);
    primaryLight.position.set(-8, 15, 12);
    primaryLight.angle = Math.PI / 5;
    primaryLight.penumbra = 0.4;
    primaryLight.lookAt(ball.position);
    scene.add(primaryLight);

    // Secondary magenta rim light (subtle for mini)
    const rimLight = new THREE.SpotLight(0xFF20FF, 0.5);
    rimLight.position.set(8, -10, 8);
    rimLight.angle = Math.PI / 4;
    rimLight.penumbra = 0.6;
    rimLight.lookAt(ball.position);
    scene.add(rimLight);

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

    // Continuous rotation for visual appeal (faster for mini)
    groupRef.current.rotation.y += 0.01;

    // Animate particles (simpler for mini)
    if (particlesRef.current) {
      const time = performance.now() * 0.001;
      const positions = particlesRef.current.geometry.getAttribute('position');

      // Simple rotation animation for mini particles
      particlesRef.current.rotation.y = time * 0.1;
      particlesRef.current.rotation.z = Math.sin(time * 0.3) * 0.1;

      // Update particle opacity based on session state
      if (particlesRef.current.material instanceof THREE.PointsMaterial) {
        const targetOpacity = isSessionActive ? 0.7 : 0.3;
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
            intensity: 0.3 + (currentVolume * 0.2) // Volume responsive for mini
          };
        case 'requesting_mic':
        case 'fetching_token':
        case 'establishing_connection':
          return {
            base: 0x801090,    // Neon violet
            emissive: 0x6A00FF, // Purple blend
            intensity: 0.25 + Math.sin(Date.now() * 0.004) * 0.05 // Subtle pulsing
          };
        case 'error':
          return {
            base: 0xFF20FF,    // Neon magenta
            emissive: 0xF040F0, // Vivid fuchsia
            intensity: 0.4 + Math.sin(Date.now() * 0.006) * 0.1 // Error pulsing
          };
        default:
          return {
            base: 0x0C0722,    // Base dark
            emissive: 0x2020A0, // Deep blue
            intensity: 0.08
          };
      }
    })();

    // Update wireframe with fixed bright color that won't turn white
    if (wireframeRef.current && wireframeRef.current.material instanceof THREE.LineBasicMaterial) {
      wireframeRef.current.material.color.setHex(0xFF20FF); // Bright magenta - always visible
      wireframeRef.current.material.opacity = 1.0;
      wireframeRef.current.visible = true;
    }

    // Update glow mesh color and intensity - ensure visibility but don't overpower wireframe
    if (glowMeshRef.current && glowMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
      glowMeshRef.current.material.color.setHex(colors.emissive);
      glowMeshRef.current.material.opacity = Math.min(colors.intensity * 0.2, 0.1); // Reduced for mini orb
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

      const offset = 6; // Base radius for mini version
      const amp = 1.5; // Smaller amplitude for mini
      const time = window.performance.now();
      vertex.normalize();

      // Noise frequency - controls the organic movement
      const rf = 0.00001;

      // Calculate the distance from center with noise and volume influence
      const distance =
        offset +
        volume * 2 * intensity + // Volume effect amplified by intensity (smaller for mini)
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

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        ref={containerRef}
        className="hover:cursor-pointer aspect-square w-full transition-all duration-200 hover:scale-110"
        onClick={handleClick}
        style={{
          filter: (() => {
            switch (connectionStatus) {
              case 'connected':
                return isSessionActive
                  ? 'drop-shadow(0 0 15px rgba(32, 80, 240, 0.6)) drop-shadow(0 0 30px rgba(255, 32, 255, 0.3))'
                  : 'drop-shadow(0 0 10px rgba(32, 80, 240, 0.4))';
              case 'requesting_mic':
              case 'fetching_token':
              case 'establishing_connection':
                return 'drop-shadow(0 0 12px rgba(128, 16, 144, 0.4)) drop-shadow(0 0 25px rgba(106, 0, 255, 0.2))';
              case 'error':
                return 'drop-shadow(0 0 18px rgba(255, 32, 255, 0.6)) drop-shadow(0 0 35px rgba(240, 64, 240, 0.3))';
              default:
                return 'drop-shadow(0 0 8px rgba(12, 7, 34, 0.2))';
            }
          })(),
          transition: 'filter 0.2s ease'
        }}
      />
    </div>
  );
};

export default OrbMini;