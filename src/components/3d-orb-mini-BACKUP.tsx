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
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

    // Determine material color based on connection status (black/white theme)
    const getOrbColor = () => {
      switch (connectionStatus) {
        case 'connected':
          return 0xffffff; // White when connected
        case 'requesting_mic':
        case 'fetching_token':
        case 'establishing_connection':
          return 0x666666; // Gray when connecting
        case 'error':
          return 0x333333; // Dark gray when error
        default:
          return 0x999999; // Medium gray when disconnected
      }
    };

    const lambertMaterial = new THREE.MeshLambertMaterial({
      color: getOrbColor(),
      wireframe: true,
    });

    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    ballRef.current = ball;

    // Store the original positions of the vertices for smooth animation
    const positionAttribute = ball.geometry.getAttribute('position');
    originalPositionsRef.current = new Float32Array(positionAttribute.array);

    group.add(ball);

    // Lighting setup for beautiful rendering (softer for mini)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.intensity = 0.7;
    spotLight.position.set(-5, 20, 10);
    spotLight.lookAt(ball.position);
    scene.add(spotLight);

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

    // Update material color based on connection status (black/white theme)
    if (ballRef.current.material instanceof THREE.MeshLambertMaterial) {
      const targetColor = (() => {
        switch (connectionStatus) {
          case 'connected':
            return 0xffffff; // White when connected
          case 'requesting_mic':
          case 'fetching_token':
          case 'establishing_connection':
            return 0x666666; // Gray when connecting
          case 'error':
            return 0x333333; // Dark gray when error
          default:
            return 0x999999; // Medium gray when disconnected
        }
      })();

      ballRef.current.material.color.setHex(targetColor);
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
          filter: isSessionActive
            ? 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))'
            : connectionStatus !== 'disconnected'
            ? 'drop-shadow(0 0 8px rgba(150, 150, 150, 0.3))'
            : 'none',
          transition: 'filter 0.2s ease'
        }}
      />
    </div>
  );
};

export default OrbMini;