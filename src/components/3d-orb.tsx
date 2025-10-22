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
  isListening?: boolean;
}

const Orb: React.FC<OrbProps> = ({
  intensity = 3,
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
    console.log('🚀 INICIALIZANDO ORB');
    initViz();
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
      cleanup();
    };
  }, []);

  useEffect(() => {
    console.log('🔄 STATE CHANGE:', {
      isSessionActive,
      connectionStatus,
      isSpeaking,
      isListening,
      currentVolume: currentVolume.toFixed(3),
      ballExists: !!ballRef.current
    });

    if (isSessionActive && ballRef.current) {
      // Use a minimum volume for breathing effect when agent is speaking
      const effectiveVolume = isSpeaking ? Math.max(currentVolume, 0.3) : currentVolume;
      console.log('✅ Morphing ball - effectiveVolume:', effectiveVolume.toFixed(3));

      updateBallMorph(ballRef.current, effectiveVolume);
    } else if (
      !isSessionActive &&
      ballRef.current &&
      originalPositionsRef.current
    ) {
      console.log('🔄 Resetting ball to static state');
      resetBallMorph(ballRef.current, originalPositionsRef.current);
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
    if (!containerRef.current) {
      console.log('❌ No container');
      return;
    }

    console.log('🏗️ Creating scene');
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

    // Create the icosahedron geometry - IGUAL QUE BACKUP PERO CON GRADIENTES
    const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 8);

    // SINGLE GEOMETRY SYSTEM - morph the actual visible wireframe like backup
    // Create vertex colors for blue-to-magenta gradient directly on the main geometry
    const vertexCount = icosahedronGeometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      // Get vertex position to determine gradient
      const x = icosahedronGeometry.attributes.position.getX(i);
      const y = icosahedronGeometry.attributes.position.getY(i);
      const z = icosahedronGeometry.attributes.position.getZ(i);

      // Calculate gradient factor based on position (0 = blue, 1 = magenta)
      const gradientFactor = (y + 10) / 20; // Normalize Y position to 0-1
      const clampedFactor = Math.max(0, Math.min(1, gradientFactor));

      // Interpolate between electric blue (0x2050F0) and neon magenta (0xFF20FF)
      const blueR = 0x20 / 255, blueG = 0x50 / 255, blueB = 0xF0 / 255;
      const magentaR = 0xFF / 255, magentaG = 0x20 / 255, magentaB = 0xFF / 255;

      colors[i * 3] = blueR + (magentaR - blueR) * clampedFactor;     // R
      colors[i * 3 + 1] = blueG + (magentaG - blueG) * clampedFactor; // G
      colors[i * 3 + 2] = blueB + (magentaB - blueB) * clampedFactor; // B
    }

    icosahedronGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // SINGLE WIREFRAME MATERIAL - like backup but with vertex colors
    const lambertMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true, // Use gradient colors
      wireframe: true,    // Wireframe mode like backup
    });

    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    ballRef.current = ball;

    console.log('⭐ Single ball created with gradient wireframe (like backup)');

    // Store the original positions of the vertices for smooth animation
    const positionAttribute = ball.geometry.getAttribute('position');
    originalPositionsRef.current = new Float32Array(positionAttribute.array);

    // Add only the ball (which IS the wireframe) to group
    group.add(ball);

    // Lighting setup for beautiful rendering - BRIGHT WHITE LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // BRIGHT
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.intensity = 2.0; // EXTRA BRIGHT
    spotLight.position.set(-10, 40, 20);
    spotLight.lookAt(ball.position);
    spotLight.castShadow = true;
    scene.add(spotLight);

    scene.add(group);

    console.log('🎬 Starting render');
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
      console.log('❌ Missing refs for render');
      return;
    }

    // Continuous rotation for visual appeal
    groupRef.current.rotation.y += 0.005;

    // Ensure ball wireframe is always visible with gradient colors
    ballRef.current.visible = true;

    // Debug log every second
    if (performance.now() % 1000 < 16) {
      console.log('🌈 GRADIENT RENDER:', {
        ballVisible: ballRef.current.visible,
        hasVertexColors: !!ballRef.current.geometry.attributes.color,
        groupVisible: groupRef.current.visible,
        material: ballRef.current.material instanceof THREE.MeshLambertMaterial ? 'Lambert' : 'Other'
      });
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
      const amp = 2.5; // Amplitude for dramatic effect (mismo que backup)
      const time = window.performance.now();
      vertex.normalize();

      // Noise frequency - controls the organic movement (mismo que backup)
      const rf = 0.00001;

      // Calculate the distance from center with noise and volume influence
      const distance =
        offset +
        volume * 4 * intensity + // Volume effect amplified by intensity (mismo que backup)
        noise(
          vertex.x + time * rf * 7,
          vertex.y + time * rf * 8,
          vertex.z + time * rf * 9,
        ) *
          amp *
          volume * intensity; // Noise effect also amplified (mismo que backup)

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
    console.log('🖱️ ORB CLICKED');
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
          filter: isSessionActive
            ? 'drop-shadow(0 0 20px rgba(255, 0, 128, 0.8))'
            : 'drop-shadow(0 0 10px rgba(255, 0, 128, 0.4))',
          transition: 'filter 0.3s ease'
        }}
      />

      {/* Status indicator */}
      <div className="text-center space-y-2">
        <p className="text-sm text-black">
          {getStatusText()}
        </p>

        {/* Connection status for debugging */}
        <div className="text-xs text-black opacity-50">
          Status: {connectionStatus} | Volume: {currentVolume.toFixed(3)} | Active: {isSessionActive ? 'YES' : 'NO'}
          <br />
          Speaking: {isSpeaking ? 'YES' : 'NO'} | EffectiveVol: {
            isSessionActive ? (isSpeaking ? Math.max(currentVolume, 0.3) : currentVolume).toFixed(3) : '0.000'
          }
        </div>
      </div>
    </div>
  );
};

export default Orb;