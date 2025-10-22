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
  const wireframeRef = useRef<THREE.LineSegments | null>(null);
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
      // Calculate effective volume for different states
      let effectiveVolume = currentVolume;

      if (isSpeaking) {
        // When agent is speaking, use actual volume + minimum breathing effect
        effectiveVolume = Math.max(currentVolume, 0.2);
        console.log('🗣️ Agent speaking - volume:', effectiveVolume.toFixed(3));
      } else if (isListening) {
        // When listening, use actual volume + smaller minimum for user feedback
        effectiveVolume = Math.max(currentVolume, 0.1);
        console.log('👂 User speaking - volume:', effectiveVolume.toFixed(3));
      } else {
        // Connected but idle - subtle breathing
        effectiveVolume = Math.max(currentVolume, 0.05);
        console.log('💤 Idle connected - volume:', effectiveVolume.toFixed(3));
      }

      updateBallMorph(ballRef.current, effectiveVolume);

      // Also morph wireframe to match
      if (wireframeRef.current) {
        updateWireframeMorph(wireframeRef.current, effectiveVolume);
      }
    } else if (
      !isSessionActive &&
      ballRef.current &&
      originalPositionsRef.current
    ) {
      console.log('🔄 Resetting ball to static state');
      resetBallMorph(ballRef.current, originalPositionsRef.current);

      // Also reset wireframe
      if (wireframeRef.current) {
        resetWireframeMorph(wireframeRef.current, originalPositionsRef.current);
      }
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

    // Create the icosahedron geometry with gradient wireframe
    const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 8);

    // Create dual-geometry system for gradient colors
    // 1. Invisible base mesh for morphing functionality
    const baseMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      visible: false
    });
    const ball = new THREE.Mesh(icosahedronGeometry, baseMaterial);

    // 2. Wireframe with GRADIENT COLORS
    const edgesGeometry = new THREE.EdgesGeometry(icosahedronGeometry);

    // Create vertex colors for blue-to-magenta gradient
    const vertexCount = edgesGeometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      // Get vertex position to determine gradient
      const x = edgesGeometry.attributes.position.getX(i);
      const y = edgesGeometry.attributes.position.getY(i);
      const z = edgesGeometry.attributes.position.getZ(i);

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

    edgesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const wireframeMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: false,
      opacity: 1.0
    });

    const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
    ball.position.set(0, 0, 0);
    wireframe.position.set(0, 0, 0);

    ballRef.current = ball;
    wireframeRef.current = wireframe;

    console.log('⭐ Ball and wireframe created with gradients');

    // Store the original positions of the vertices for smooth animation
    const positionAttribute = ball.geometry.getAttribute('position');
    originalPositionsRef.current = new Float32Array(positionAttribute.array);

    // Add both ball and wireframe to group
    group.add(ball);
    group.add(wireframe);

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

    // Ensure wireframe is always visible with gradient colors
    if (wireframeRef.current) {
      wireframeRef.current.visible = true;

      // Debug log every second
      if (performance.now() % 1000 < 16) {
        console.log('🌈 GRADIENT RENDER:', {
          wireframeVisible: wireframeRef.current.visible,
          hasVertexColors: !!wireframeRef.current.geometry.attributes.color,
          ballVisible: ballRef.current.visible,
          groupVisible: groupRef.current.visible
        });
      }
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
      const amp = 3.0; // Increased amplitude for more dramatic effect
      const time = window.performance.now();
      vertex.normalize();

      // Different noise frequencies for different states
      let rf = 0.00001; // Base noise frequency
      let volumeMultiplier = 4;

      if (isSpeaking) {
        // Faster, more energetic movement when agent speaks
        rf = 0.00003;
        volumeMultiplier = 6;
      } else if (isListening) {
        // Medium energy when user speaks
        rf = 0.00002;
        volumeMultiplier = 5;
      }

      // Calculate the distance from center with noise and volume influence
      const distance =
        offset +
        volume * volumeMultiplier * intensity + // Volume effect amplified by intensity and state
        noise(
          vertex.x + time * rf * 7,
          vertex.y + time * rf * 8,
          vertex.z + time * rf * 9,
        ) *
          amp *
          (volume + 0.1) * intensity; // Ensure some noise even at low volume

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
    // Update wireframe positions to match the morphed ball
    if (ballRef.current) {
      const ballGeometry = ballRef.current.geometry as THREE.BufferGeometry;
      const ballPositions = ballGeometry.getAttribute("position");
      const wireframeGeometry = wireframe.geometry as THREE.BufferGeometry;
      const wireframePositions = wireframeGeometry.getAttribute("position");

      // Recreate edges geometry from morphed ball
      const tempGeometry = new THREE.IcosahedronGeometry(10, 8);
      tempGeometry.attributes.position.copy(ballPositions);
      const newEdgesGeometry = new THREE.EdgesGeometry(tempGeometry);

      // Copy new positions to wireframe
      wireframeGeometry.attributes.position.copy(newEdgesGeometry.attributes.position);
      wireframeGeometry.attributes.position.needsUpdate = true;

      tempGeometry.dispose();
      newEdgesGeometry.dispose();
    }
  };

  const resetWireframeMorph = (wireframe: THREE.LineSegments, originalPositions: Float32Array) => {
    // Reset wireframe to original shape with gradient colors preserved
    const originalGeometry = new THREE.IcosahedronGeometry(10, 8);
    const edgesGeometry = new THREE.EdgesGeometry(originalGeometry);

    // Copy original positions
    wireframe.geometry.attributes.position.copy(edgesGeometry.attributes.position);
    wireframe.geometry.attributes.position.needsUpdate = true;

    // Preserve gradient colors (don't recreate them)
    console.log('🔄 Wireframe reset with gradient colors preserved');

    originalGeometry.dispose();
    edgesGeometry.dispose();
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
          Speaking: {isSpeaking ? 'YES' : 'NO'} | Listening: {isListening ? 'YES' : 'NO'}
        </div>
      </div>
    </div>
  );
};

export default Orb;